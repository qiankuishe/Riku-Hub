<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { NoteRecord } from '../../core/api';
import { notesApi } from '../../core/api';
import UiButton from '../../../src/components/ui/UiButton.vue';
import UiField from '../../../src/components/ui/UiField.vue';
import ConfirmModal from '../../modules/navigation/ConfirmModal.vue';
import { useUiStore } from '../../../src/stores/ui';
import { formatDateTime } from '../../core/format';

type ViewMode = 'write' | 'preview' | 'split';

const uiStore = useUiStore();
const initialFocusId = new URLSearchParams(window.location.search).get('focus');

const notes = ref<NoteRecord[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const searchQuery = ref('');
const selectedNoteId = ref<string | null>(null);
const editTitle = ref('');
const editContent = ref('');
const viewMode = ref<ViewMode>('write');
const renderedPreview = ref('');
const deleteTarget = ref<NoteRecord | null>(null);
const highlightedId = ref<string | null>(null);

let saveTimer = 0;
let previewRunId = 0;
let hydrating = false;
let markdownRenderer: ((value: string) => Promise<string>) | null = null;

const filtered = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase();
  if (!needle) {
    return notes.value;
  }
  return notes.value.filter((note) => note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle));
});
const pinnedNotes = computed(() => filtered.value.filter((note) => note.isPinned));
const recentNotes = computed(() => filtered.value.filter((note) => !note.isPinned));
const selectedNote = computed(() => notes.value.find((note) => note.id === selectedNoteId.value) ?? null);
const characterCount = computed(() => editContent.value.trim().length);
const lineCount = computed(() => (editContent.value ? editContent.value.split(/\r?\n/).length : 0));

watch(selectedNote, (note) => {
  hydrating = true;
  editTitle.value = note?.title ?? '';
  editContent.value = note?.content ?? '';
  nextTick(() => {
    hydrating = false;
  });
});

watch([editTitle, editContent], () => {
  if (hydrating || !selectedNote.value) {
    return;
  }
  queueSave();
});

watch(
  () => [viewMode.value, editContent.value],
  async ([mode, content]) => {
    if (mode === 'write') {
      return;
    }
    const runId = ++previewRunId;
    const html = await renderMarkdown(content);
    if (runId !== previewRunId) {
      return;
    }
    renderedPreview.value = html;
  },
  { immediate: true }
);

onMounted(async () => {
  uiStore.clearSecondaryNav();
  await loadAll();
  if (initialFocusId && notes.value.some((note) => note.id === initialFocusId)) {
    selectedNoteId.value = initialFocusId;
    highlightedId.value = initialFocusId;
    window.setTimeout(() => {
      highlightedId.value = null;
    }, 2000);
  }
});

onUnmounted(() => {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
});

async function loadAll() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await notesApi.getAll();
    notes.value = data.notes;
    if (!selectedNoteId.value && notes.value.length) {
      selectedNoteId.value = notes.value[0].id;
    }
    if (selectedNoteId.value && !notes.value.some((note) => note.id === selectedNoteId.value)) {
      selectedNoteId.value = notes.value[0]?.id ?? null;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

async function createNote() {
  saving.value = true;
  try {
    const data = await notesApi.create({ title: '新笔记', content: '' });
    notes.value = [data.note, ...notes.value];
    selectedNoteId.value = data.note.id;
    viewMode.value = 'write';
    uiStore.showToast('已创建笔记');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '创建失败');
  } finally {
    saving.value = false;
  }
}

async function saveNow() {
  if (!selectedNote.value) {
    return;
  }
  saving.value = true;
  try {
    const data = await notesApi.update(selectedNote.value.id, {
      title: editTitle.value.trim() || '无标题',
      content: editContent.value
    });
    notes.value = notes.value.map((note) => (note.id === data.note.id ? data.note : note));
    notes.value.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    saving.value = false;
  }
}

function queueSave() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    void saveNow();
  }, 600);
}

async function togglePin() {
  if (!selectedNote.value) {
    return;
  }
  try {
    const data = await notesApi.update(selectedNote.value.id, {
      isPinned: !selectedNote.value.isPinned
    });
    notes.value = notes.value.map((note) => (note.id === data.note.id ? data.note : note));
    notes.value.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.localeCompare(a.updatedAt));
    uiStore.showToast(data.note.isPinned ? '已置顶' : '已取消置顶');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '操作失败');
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) {
    return;
  }
  try {
    await notesApi.delete(deleteTarget.value.id);
    notes.value = notes.value.filter((note) => note.id !== deleteTarget.value?.id);
    if (selectedNoteId.value === deleteTarget.value.id) {
      selectedNoteId.value = notes.value[0]?.id ?? null;
    }
    deleteTarget.value = null;
    uiStore.showToast('已删除');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '删除失败');
  }
}

async function renderMarkdown(content: string) {
  if (!markdownRenderer) {
    markdownRenderer = async (value: string) => {
      const [{ marked }, purifier] = await Promise.all([import('marked'), import('dompurify')]);
      marked.setOptions({ breaks: true, gfm: true });
      return purifier.default.sanitize(marked.parse(value) as string);
    };
  }
  return markdownRenderer(content);
}

function noteExcerpt(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 54) || '空白笔记';
}
</script>

<template>
  <div class="v3-page">
    <section class="v3-card">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">笔记</h2>
          <p class="v3-muted">自动保存，支持 Markdown 预览。</p>
        </div>
        <div class="v3-inline-actions">
          <UiButton variant="primary" :disabled="saving" @click="createNote">新增笔记</UiButton>
          <UiButton variant="tertiary" :disabled="loading" @click="loadAll">刷新</UiButton>
        </div>
      </div>

      <UiField label="搜索">
        <input v-model="searchQuery" placeholder="按标题或内容搜索..." />
      </UiField>
    </section>

    <section class="v3-split">
      <aside class="v3-card">
        <div v-if="loading" class="v3-muted">加载中...</div>
        <div v-else-if="errorMessage" class="v3-danger">{{ errorMessage }}</div>
        <template v-else>
          <div class="v3-list">
            <strong>置顶 ({{ pinnedNotes.length }})</strong>
            <button
              v-for="note in pinnedNotes"
              :key="note.id"
              class="v3-item"
              :class="{ active: selectedNoteId === note.id, 'v3-highlight': highlightedId === note.id }"
              style="text-align: left;"
              @click="selectedNoteId = note.id"
            >
              <strong>{{ note.title || '无标题' }}</strong>
              <p class="v3-muted">{{ noteExcerpt(note.content) }}</p>
            </button>
          </div>
          <div class="v3-list" style="margin-top: 10px;">
            <strong>最近 ({{ recentNotes.length }})</strong>
            <button
              v-for="note in recentNotes"
              :key="note.id"
              class="v3-item"
              :class="{ active: selectedNoteId === note.id, 'v3-highlight': highlightedId === note.id }"
              style="text-align: left;"
              @click="selectedNoteId = note.id"
            >
              <strong>{{ note.title || '无标题' }}</strong>
              <p class="v3-muted">{{ noteExcerpt(note.content) }}</p>
            </button>
          </div>
        </template>
      </aside>

      <section class="v3-card">
        <template v-if="selectedNote">
          <div class="v3-card-head">
            <div class="v3-inline-actions">
              <button class="v3-chip" :class="{ active: viewMode === 'write' }" @click="viewMode = 'write'">写作</button>
              <button class="v3-chip" :class="{ active: viewMode === 'preview' }" @click="viewMode = 'preview'">预览</button>
              <button class="v3-chip" :class="{ active: viewMode === 'split' }" @click="viewMode = 'split'">分栏</button>
            </div>
            <div class="v3-inline-actions">
              <UiButton size="sm" variant="tertiary" @click="togglePin">
                {{ selectedNote.isPinned ? '取消置顶' : '置顶' }}
              </UiButton>
              <UiButton size="sm" variant="danger" @click="deleteTarget = selectedNote">删除</UiButton>
            </div>
          </div>

          <div class="v3-list">
            <UiField label="标题">
              <input v-model="editTitle" placeholder="笔记标题" />
            </UiField>
            <div class="v3-muted">字数 {{ characterCount }} · 行数 {{ lineCount }} · 更新 {{ formatDateTime(selectedNote.updatedAt) }}</div>

            <div v-if="viewMode === 'write'" class="v3-editor">
              <textarea v-model="editContent" />
            </div>
            <div v-else-if="viewMode === 'preview'" class="v3-preview" v-html="renderedPreview"></div>
            <div v-else class="v3-split" style="grid-template-columns: 1fr 1fr;">
              <div class="v3-editor">
                <textarea v-model="editContent" />
              </div>
              <div class="v3-preview" v-html="renderedPreview"></div>
            </div>
          </div>
        </template>
        <div v-else class="v3-muted">请选择一条笔记开始编辑。</div>
      </section>
    </section>

    <ConfirmModal
      :open="Boolean(deleteTarget)"
      title="删除笔记"
      :message="`确认删除「${deleteTarget?.title || '无标题'}」？`"
      confirm-text="删除"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
