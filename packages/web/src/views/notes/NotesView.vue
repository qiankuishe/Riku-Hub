<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useNotesStore } from '../../stores/notes';
import { useUiStore } from '../../stores/ui';
import { formatDateTime } from '../../utils/date';

const notesStore = useNotesStore();
const uiStore = useUiStore();
const initialFocusId = new URLSearchParams(window.location.search).get('focus');

const notesSectionId = 'notes-list-top';
const pinnedSectionId = 'notes-pinned';
const recentSectionId = 'notes-recent';

const selectedNoteId = ref<string | null>(null);
const searchQuery = ref('');
const editTitle = ref('');
const editContent = ref('');
const viewMode = ref<'write' | 'preview' | 'split'>('write');
const previewLoading = ref(false);
const saveState = ref<'idle' | 'saving' | 'saved'>('idle');
const deleteTargetId = ref<string | null>(null);
const highlightedNoteId = ref<string | null>(null);
const renderedPreview = ref('');
const editorTextarea = ref<HTMLTextAreaElement | null>(null);

let initialFocusHandled = false;
let saveTimer: number | undefined;
let hydrating = false;
let previewRunId = 0;
let renderMarkdown: ((content: string) => string) | null = null;

const selectedNote = computed(() => notesStore.notes.find((note) => note.id === selectedNoteId.value) ?? null);
const totalCount = computed(() => notesStore.notes.length);
const pinnedCount = computed(() => notesStore.notes.filter((note) => note.isPinned).length);
const updatedTodayCount = computed(() => notesStore.notes.filter((note) => isSameLocalDay(note.updatedAt)).length);
const filteredNotes = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase();
  if (!needle) {
    return notesStore.notes;
  }

  return notesStore.notes.filter((note) => {
    return note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle);
  });
});
const filteredCount = computed(() => filteredNotes.value.length);
const pinnedNotes = computed(() => filteredNotes.value.filter((note) => note.isPinned));
const recentNotes = computed(() => filteredNotes.value.filter((note) => !note.isPinned));
const activeCharacterCount = computed(() => getCharacterCount(editContent.value));
const activeLineCount = computed(() => (editContent.value ? editContent.value.split(/\r?\n/).length : 0));
const noteGroups = computed(() => [
  { key: 'pinned', label: '置顶笔记', count: pinnedNotes.value.length, notes: pinnedNotes.value, sectionId: pinnedSectionId },
  { key: 'recent', label: pinnedNotes.value.length ? '最近编辑' : '全部笔记', count: recentNotes.value.length, notes: recentNotes.value, sectionId: recentSectionId }
]);
const emptyMessage = computed(() => {
  if (notesStore.loading) {
    return '正在加载笔记...';
  }
  if (!totalCount.value) {
    return '还没有笔记，先创建一条吧。';
  }
  if (searchQuery.value.trim()) {
    return '没有找到匹配的笔记，换个关键词试试。';
  }
  return '当前筛选下没有内容。';
});

watch(
  () => notesStore.notes,
  (notes) => {
    if (!notes.length) {
      selectedNoteId.value = null;
      editTitle.value = '';
      editContent.value = '';
      return;
    }
    if (!selectedNoteId.value || !notes.some((note) => note.id === selectedNoteId.value)) {
      selectNote(notes[0].id);
    }
  },
  { deep: true, immediate: true }
);

watch(selectedNote, (note) => {
  hydrating = true;
  editTitle.value = note?.title ?? '';
  editContent.value = note?.content ?? '';
  saveState.value = 'idle';
  nextTick(() => {
    hydrating = false;
  });
});

watch([editTitle, editContent], () => {
  if (!selectedNote.value || hydrating) {
    return;
  }
  queueSave();
});

watch(
  [viewMode, editContent],
  async ([mode, content]) => {
    if (mode === 'write') {
      previewLoading.value = false;
      return;
    }

    const runId = ++previewRunId;
    previewLoading.value = true;
    const renderer = await ensureMarkdownRenderer();
    if (runId !== previewRunId) {
      return;
    }
    renderedPreview.value = renderer(content);
    previewLoading.value = false;
  },
  { immediate: true }
);

watch(
  () => [filteredCount.value, pinnedNotes.value.length, recentNotes.value.length, totalCount.value],
  () => {
    uiStore.setSecondaryNav({
      title: '笔记',
      activeKey: 'all',
      items: [
        { key: 'all', label: '全部', badge: String(filteredCount.value || totalCount.value), targetId: notesSectionId },
        { key: 'pinned', label: '置顶', badge: String(pinnedNotes.value.length), targetId: pinnedSectionId },
        { key: 'recent', label: '最近', badge: String(recentNotes.value.length), targetId: recentSectionId }
      ]
    });
  },
  { immediate: true }
);

watch(
  () => notesStore.notes,
  async () => {
    if (initialFocusHandled || !initialFocusId || !notesStore.notes.some((note) => note.id === initialFocusId)) {
      return;
    }
    initialFocusHandled = true;
    selectNote(initialFocusId);
    highlightedNoteId.value = initialFocusId;
    await nextTick();
    document.querySelector(`[data-note-id="${initialFocusId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.setTimeout(() => {
      if (highlightedNoteId.value === initialFocusId) {
        highlightedNoteId.value = null;
      }
    }, 2200);
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  void notesStore.loadAll();
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
});

function isSameLocalDay(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function getCharacterCount(content: string) {
  return content.replace(/\s+/g, '').length;
}

function getNoteExcerpt(content: string) {
  const excerpt = content.replace(/\s+/g, ' ').trim();
  return excerpt ? excerpt.slice(0, 72) : '空白笔记';
}

function selectNote(id: string) {
  selectedNoteId.value = id;
}

async function ensureMarkdownRenderer() {
  if (renderMarkdown) {
    return renderMarkdown;
  }

  const [{ marked }, domPurifyModule] = await Promise.all([import('marked'), import('dompurify')]);
  marked.setOptions({ breaks: true, gfm: true });
  const DOMPurify = domPurifyModule.default;
  renderMarkdown = (content: string) => DOMPurify.sanitize(marked.parse(content) as string);
  return renderMarkdown;
}

async function createNote() {
  const note = await notesStore.createNote({ title: '新笔记', content: '' });
  selectedNoteId.value = note.id;
  viewMode.value = 'write';
  uiStore.showToast('已创建新笔记');
  await nextTick();
  editorTextarea.value?.focus();
}

function queueSave() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
  saveState.value = 'saving';
  saveTimer = window.setTimeout(async () => {
    if (!selectedNote.value) {
      return;
    }
    try {
      const updated = await notesStore.updateNote(selectedNote.value.id, {
        title: editTitle.value.trim() || '无标题',
        content: editContent.value
      });
      selectedNoteId.value = updated.id;
      saveState.value = 'saved';
      window.setTimeout(() => {
        if (saveState.value === 'saved') {
          saveState.value = 'idle';
        }
      }, 1200);
    } catch (error) {
      uiStore.showToast(error instanceof Error ? error.message : '自动保存失败');
      saveState.value = 'idle';
    }
  }, 600);
}

async function togglePin() {
  if (!selectedNote.value) {
    return;
  }
  await notesStore.updateNote(selectedNote.value.id, {
    isPinned: !selectedNote.value.isPinned
  });
  uiStore.showToast(selectedNote.value.isPinned ? '已取消置顶' : '已置顶');
}

function insertMarkdown(before: string, after = '', placeholder = '内容') {
  const textarea = editorTextarea.value;
  if (!textarea) {
    editContent.value += `${before}${placeholder}${after}`;
    return;
  }

  const start = textarea.selectionStart ?? editContent.value.length;
  const end = textarea.selectionEnd ?? start;
  const selected = editContent.value.slice(start, end) || placeholder;
  editContent.value = `${editContent.value.slice(0, start)}${before}${selected}${after}${editContent.value.slice(end)}`;

  nextTick(() => {
    textarea.focus();
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selected.length;
    textarea.setSelectionRange(selectionStart, selectionEnd);
  });
}

function insertLinePrefix(prefix: string, placeholder: string) {
  const textarea = editorTextarea.value;
  if (!textarea) {
    editContent.value += `\n${prefix}${placeholder}`;
    return;
  }

  const start = textarea.selectionStart ?? editContent.value.length;
  const end = textarea.selectionEnd ?? start;
  const selection = editContent.value.slice(start, end);
  const content = selection || placeholder;
  const withPrefix = content
    .split(/\r?\n/)
    .map((line) => `${prefix}${line}`)
    .join('\n');

  editContent.value = `${editContent.value.slice(0, start)}${withPrefix}${editContent.value.slice(end)}`;

  nextTick(() => {
    textarea.focus();
    textarea.setSelectionRange(start, start + withPrefix.length);
  });
}

async function confirmDelete() {
  if (!deleteTargetId.value) {
    return;
  }
  await notesStore.deleteNote(deleteTargetId.value);
  deleteTargetId.value = null;
  uiStore.showToast('笔记已删除');
}
</script>

<template>
  <div class="page-shell page-shell-wide">
    <section class="panel notes-hero-panel">
      <div class="section-head notes-hero-head">
        <div class="notes-hero-copy">
          <p class="eyebrow">Notes Desk</p>
          <h2>笔记</h2>
          <p class="section-subtitle">把记录、草稿和 Markdown 内容集中整理在一个工作台里。</p>
        </div>
        <div class="section-head-actions">
          <button class="primary" @click="createNote">新建笔记</button>
        </div>
      </div>

      <div class="meta-grid notes-hero-grid">
        <div class="metric-card">
          <span>总笔记数</span>
          <strong>{{ totalCount }}</strong>
        </div>
        <div class="metric-card">
          <span>置顶笔记</span>
          <strong>{{ pinnedCount }}</strong>
        </div>
        <div class="metric-card">
          <span>今日更新</span>
          <strong>{{ updatedTodayCount }}</strong>
        </div>
        <div class="metric-card">
          <span>当前字数</span>
          <strong>{{ activeCharacterCount }}</strong>
        </div>
      </div>
    </section>

    <div class="notes-layout">
      <section class="panel notes-sidebar-panel">
        <div id="notes-list-top" class="section-head">
          <div>
            <h3>笔记列表</h3>
            <p class="section-subtitle">{{ filteredCount }} 条结果</p>
          </div>
        </div>

        <label class="field notes-search-field">
          <span>搜索</span>
          <input v-model="searchQuery" placeholder="搜索标题或内容" />
        </label>

        <div v-if="filteredCount === 0" class="empty-state">{{ emptyMessage }}</div>
        <div v-else class="notes-groups">
          <section
            v-for="group in noteGroups"
            :id="group.sectionId"
            :key="group.key"
            class="notes-group"
          >
            <div class="notes-group-head">
              <div>
                <h3>{{ group.label }}</h3>
              </div>
              <span class="inline-status">{{ group.count }} 条</span>
            </div>

            <div v-if="group.notes.length === 0" class="notes-group-empty">这一组里还没有笔记。</div>
            <div v-else class="notes-list">
              <button
                v-for="note in group.notes"
                :key="note.id"
                :data-note-id="note.id"
                class="note-list-item"
                :class="{
                  'note-list-item-active': note.id === selectedNoteId,
                  'search-highlight': note.id === highlightedNoteId
                }"
                @click="selectNote(note.id)"
              >
                <div class="note-list-head">
                  <strong>{{ note.title || '无标题' }}</strong>
                  <span v-if="note.isPinned" class="note-pin-badge">置顶</span>
                </div>
                <p>{{ getNoteExcerpt(note.content) }}</p>
                <span class="inline-status">{{ formatDateTime(note.updatedAt, '未保存') }}</span>
              </button>
            </div>
          </section>
        </div>
      </section>

      <section class="panel notes-editor-panel">
        <div v-if="!selectedNote" class="empty-state">请选择一条笔记开始编辑。</div>
        <template v-else>
          <div class="section-head notes-editor-head">
            <div>
              <h2>{{ selectedNote.title || '无标题' }}</h2>
              <p class="section-subtitle">最后更新于 {{ formatDateTime(selectedNote.updatedAt, '未保存') }}</p>
            </div>
            <div class="notes-toolbar">
              <span v-if="saveState === 'saving'" class="inline-status">保存中...</span>
              <span v-else-if="saveState === 'saved'" class="inline-status">已保存</span>
              <button class="ghost small" :class="{ 'note-view-button-active': viewMode === 'write' }" @click="viewMode = 'write'">
                编辑
              </button>
              <button class="ghost small" :class="{ 'note-view-button-active': viewMode === 'preview' }" @click="viewMode = 'preview'">
                预览
              </button>
              <button class="ghost small" :class="{ 'note-view-button-active': viewMode === 'split' }" @click="viewMode = 'split'">
                分栏
              </button>
              <button class="ghost small" @click="togglePin">
                {{ selectedNote.isPinned ? '取消置顶' : '置顶' }}
              </button>
              <button class="ghost danger small" @click="deleteTargetId = selectedNote.id">删除</button>
            </div>
          </div>

          <div class="notes-editor-meta">
            <span class="inline-status">字数 {{ activeCharacterCount }}</span>
            <span class="inline-status">行数 {{ activeLineCount }}</span>
            <span class="inline-status">创建于 {{ formatDateTime(selectedNote.createdAt, '未保存') }}</span>
          </div>

          <div class="notes-markdown-toolbar">
            <button class="ghost small" @click="insertLinePrefix('## ', '标题')">H2</button>
            <button class="ghost small" @click="insertMarkdown('**', '**', '加粗内容')">加粗</button>
            <button class="ghost small" @click="insertLinePrefix('- ', '列表项')">列表</button>
            <button class="ghost small" @click="insertLinePrefix('> ', '引用')">引用</button>
            <button class="ghost small" @click="insertMarkdown('```\n', '\n```', '代码块')">代码块</button>
            <button class="ghost small" @click="insertMarkdown('[', '](https://example.com)', '链接文字')">链接</button>
          </div>

          <div class="notes-editor-surface" :class="{ 'notes-editor-surface-split': viewMode === 'split' }">
            <div v-if="viewMode !== 'preview'" class="editor-form notes-editor-pane">
              <label class="field">
                <span>标题</span>
                <input v-model="editTitle" placeholder="输入笔记标题" />
              </label>

              <label class="field notes-content-field">
                <span>内容</span>
                <textarea ref="editorTextarea" v-model="editContent" rows="18" placeholder="支持 Markdown 语法"></textarea>
              </label>
            </div>

            <div v-if="viewMode !== 'write'" class="notes-preview-pane">
              <div v-if="previewLoading" class="markdown-preview">正在加载预览器...</div>
              <div v-else class="markdown-preview" v-html="renderedPreview"></div>
            </div>
          </div>
        </template>
      </section>
    </div>

    <div v-if="deleteTargetId" class="modal-backdrop" @click.self="deleteTargetId = null">
      <div class="modal-card confirm-card">
        <div class="section-head">
          <div>
            <h2>确认删除笔记</h2>
          </div>
        </div>
        <p class="confirm-text">确定删除当前笔记吗？</p>
        <div class="dialog-actions">
          <button class="ghost" @click="deleteTargetId = null">取消</button>
          <button class="primary danger-fill" :disabled="notesStore.saving" @click="confirmDelete">
            {{ notesStore.saving ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
