<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { SnippetRecord, SnippetType } from '../../core/api';
import { snippetsApi } from '../../core/api';
import UiButton from '../../../src/components/ui/UiButton.vue';
import UiDialog from '../../../src/components/ui/UiDialog.vue';
import UiField from '../../../src/components/ui/UiField.vue';
import ConfirmModal from '../../modules/navigation/ConfirmModal.vue';
import { useUiStore } from '../../../src/stores/ui';
import { formatBytes, formatDateTime } from '../../core/format';

const uiStore = useUiStore();
const query = new URLSearchParams(window.location.search);
const initialType = query.get('type');
const initialFocus = query.get('focus');
const initialKeyword = query.get('q');

const snippets = ref<SnippetRecord[]>([]);
const loading = ref(false);
const saving = ref(false);
const searchQuery = ref(initialKeyword ?? '');
const filterType = ref<SnippetType | 'all'>(
  initialType && ['text', 'code', 'link', 'image', 'all'].includes(initialType) ? (initialType as SnippetType | 'all') : 'all'
);
const highlightedId = ref<string | null>(initialFocus);
const errorMessage = ref('');

const draftType = ref<SnippetType>('text');
const draftTitle = ref('');
const draftContent = ref('');
const draftError = ref('');
const clipboardBusy = ref<'idle' | 'text' | 'image'>('idle');
const imageUploadInput = ref<HTMLInputElement | null>(null);

const editDialogOpen = ref(false);
const editingSnippet = ref<SnippetRecord | null>(null);
const editType = ref<SnippetType>('text');
const editTitle = ref('');
const editContent = ref('');
const deleteTarget = ref<SnippetRecord | null>(null);
const IMAGE_LIMIT_BYTES = 340 * 1024;

const typeOptions: Array<{ key: SnippetType; label: string }> = [
  { key: 'text', label: '文本' },
  { key: 'code', label: '代码' },
  { key: 'link', label: '链接' },
  { key: 'image', label: '图片' }
];

const filtered = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase();
  return snippets.value.filter((snippet) => {
    if (filterType.value !== 'all' && snippet.type !== filterType.value) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const hay = `${snippet.title} ${snippet.type === 'image' ? '' : snippet.content}`.toLowerCase();
    return hay.includes(needle);
  });
});

const typeCounts = computed(() => ({
  text: snippets.value.filter((snippet) => snippet.type === 'text').length,
  code: snippets.value.filter((snippet) => snippet.type === 'code').length,
  link: snippets.value.filter((snippet) => snippet.type === 'link').length,
  image: snippets.value.filter((snippet) => snippet.type === 'image').length
}));
const draftSizeText = computed(() => {
  if (draftType.value === 'image') {
    const approxBytes = Math.floor((draftContent.value.length * 3) / 4);
    return formatBytes(Math.max(0, approxBytes));
  }
  return `${draftContent.value.trim().length} 字`;
});

watch(
  () => [filterType.value, snippets.value.length, typeCounts.value.text, typeCounts.value.code, typeCounts.value.link, typeCounts.value.image],
  () => {
    uiStore.setSecondaryNav({
      title: '片段',
      activeKey: filterType.value,
      items: [
        { key: 'all', label: '全部', badge: String(snippets.value.length), to: '/snippets' },
        { key: 'text', label: '文本', badge: String(typeCounts.value.text), to: '/snippets?type=text' },
        { key: 'code', label: '代码', badge: String(typeCounts.value.code), to: '/snippets?type=code' },
        { key: 'link', label: '链接', badge: String(typeCounts.value.link), to: '/snippets?type=link' },
        { key: 'image', label: '图片', badge: String(typeCounts.value.image), to: '/snippets?type=image' }
      ]
    });
  },
  { immediate: true }
);

onMounted(async () => {
  await loadAll();
  if (initialFocus) {
    window.setTimeout(() => {
      highlightedId.value = null;
    }, 2400);
  }
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
});

async function loadAll() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await snippetsApi.getAll({ type: 'all' });
    snippets.value = data.snippets;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function normalizeTypeFromContent(content: string): SnippetType {
  const value = content.trim();
  if (/^https?:\/\//i.test(value)) {
    return 'link';
  }
  if (/```|^\s*(const|let|var|function|import|export|class)\b|[{};]{2,}|<\/?[a-z][\s\S]*>/m.test(value)) {
    return 'code';
  }
  return 'text';
}

function buildSuggestedTitle(type: SnippetType, content: string) {
  if (type === 'image') {
    return '剪贴图片';
  }
  if (type === 'link') {
    try {
      return new URL(content).host.replace(/^www\./, '');
    } catch {
      return '剪贴链接';
    }
  }
  return content.trim().split(/\r?\n/)[0]?.slice(0, 24) || (type === 'code' ? '剪贴代码' : '剪贴文本');
}

function validateSnippet(type: SnippetType, content: string) {
  if (type === 'image') {
    if (!content) {
      return '请先读取或上传图片';
    }
    if (new TextEncoder().encode(content).byteLength > IMAGE_LIMIT_BYTES) {
      return '图片片段过大，请压缩后重试';
    }
    return '';
  }
  if (!content.trim()) {
    return '内容不能为空';
  }
  if (type === 'link' && !/^https?:\/\//i.test(content.trim())) {
    return '链接需以 http:// 或 https:// 开头';
  }
  return '';
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

async function compressImageDataUrl(dataUrl: string, maxBytes = IMAGE_LIMIT_BYTES) {
  if (new TextEncoder().encode(dataUrl).byteLength <= maxBytes) {
    return dataUrl;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解析失败'));
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return dataUrl;
  }

  let scale = 1;
  let quality = 0.92;
  let best = dataUrl;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const next = canvas.toDataURL('image/jpeg', quality);
    best = next;
    if (new TextEncoder().encode(next).byteLength <= maxBytes) {
      return next;
    }
    scale *= 0.84;
    quality = Math.max(0.45, quality - 0.1);
  }
  return best;
}

function triggerImageUpload() {
  imageUploadInput.value?.click();
}

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  try {
    const raw = await blobToDataUrl(file);
    const compressed = await compressImageDataUrl(raw);
    if (new TextEncoder().encode(compressed).byteLength > IMAGE_LIMIT_BYTES) {
      draftError.value = '图片过大，请选择更小图片';
      return;
    }
    draftType.value = 'image';
    draftContent.value = compressed;
    if (!draftTitle.value) {
      draftTitle.value = '剪贴图片';
    }
    draftError.value = '';
    uiStore.showToast('图片已载入');
  } catch (error) {
    draftError.value = error instanceof Error ? error.message : '图片处理失败';
  } finally {
    input.value = '';
  }
}

async function createSnippet() {
  const normalizedType = draftType.value === 'text' ? normalizeTypeFromContent(draftContent.value) : draftType.value;
  let normalizedContent = normalizedType === 'link' ? draftContent.value.trim() : draftContent.value;
  if (normalizedType === 'image' && normalizedContent) {
    normalizedContent = await compressImageDataUrl(normalizedContent);
  }
  const message = validateSnippet(normalizedType, normalizedContent);
  if (message) {
    draftError.value = message;
    return;
  }
  draftError.value = '';
  saving.value = true;
  try {
    const payload = {
      type: normalizedType,
      title: draftTitle.value.trim() || buildSuggestedTitle(normalizedType, normalizedContent),
      content: normalizedContent
    };
    const data = await snippetsApi.create(payload);
    snippets.value = [data.snippet, ...snippets.value];
    draftType.value = 'text';
    draftTitle.value = '';
    draftContent.value = '';
    uiStore.showToast('片段已创建');
  } catch (error) {
    draftError.value = error instanceof Error ? error.message : '创建失败';
  } finally {
    saving.value = false;
  }
}

async function readClipboardText() {
  clipboardBusy.value = 'text';
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      draftError.value = '剪贴板文本为空';
      return;
    }
    draftContent.value = text;
    draftType.value = normalizeTypeFromContent(text);
    if (!draftTitle.value) {
      draftTitle.value = buildSuggestedTitle(draftType.value, text);
    }
    draftError.value = '';
    uiStore.showToast('已读取剪贴板文本');
  } catch (error) {
    draftError.value = error instanceof Error ? error.message : '读取失败';
  } finally {
    clipboardBusy.value = 'idle';
  }
}

async function readClipboardImage() {
  clipboardBusy.value = 'image';
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const imageType = item.types.find((type) => type.startsWith('image/'));
      if (!imageType) {
        continue;
      }
      const blob = await item.getType(imageType);
      const dataUrl = await blobToDataUrl(blob);
      const compressed = await compressImageDataUrl(dataUrl);
      if (new TextEncoder().encode(compressed).byteLength > IMAGE_LIMIT_BYTES) {
        draftError.value = '剪贴板图片过大，请先压缩';
        return;
      }
      draftType.value = 'image';
      draftContent.value = compressed;
      if (!draftTitle.value) {
        draftTitle.value = '剪贴图片';
      }
      draftError.value = '';
      uiStore.showToast('已读取剪贴板图片');
      clipboardBusy.value = 'idle';
      return;
    }
    draftError.value = '剪贴板中没有图片';
  } catch (error) {
    draftError.value = error instanceof Error ? error.message : '读取图片失败';
  } finally {
    clipboardBusy.value = 'idle';
  }
}

async function togglePin(snippet: SnippetRecord) {
  try {
    const data = await snippetsApi.update(snippet.id, { isPinned: !snippet.isPinned });
    snippets.value = snippets.value.map((entry) => (entry.id === data.snippet.id ? data.snippet : entry));
    snippets.value.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.localeCompare(a.updatedAt));
    uiStore.showToast(data.snippet.isPinned ? '已置顶' : '已取消置顶');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '操作失败');
  }
}

function openEditDialog(snippet: SnippetRecord) {
  editingSnippet.value = snippet;
  editType.value = snippet.type;
  editTitle.value = snippet.title;
  editContent.value = snippet.content;
  errorMessage.value = '';
  editDialogOpen.value = true;
}

async function saveEdit() {
  if (!editingSnippet.value) {
    return;
  }
  let nextContent = editType.value === 'link' ? editContent.value.trim() : editContent.value;
  if (editType.value === 'image' && nextContent) {
    nextContent = await compressImageDataUrl(nextContent);
  }
  const message = validateSnippet(editType.value, nextContent);
  if (message) {
    errorMessage.value = message;
    return;
  }
  saving.value = true;
  errorMessage.value = '';
  try {
    const data = await snippetsApi.update(editingSnippet.value.id, {
      type: editType.value,
      title: editTitle.value.trim() || buildSuggestedTitle(editType.value, nextContent),
      content: nextContent
    });
    snippets.value = snippets.value.map((entry) => (entry.id === data.snippet.id ? data.snippet : entry));
    snippets.value.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.localeCompare(a.updatedAt));
    editDialogOpen.value = false;
    uiStore.showToast('已保存');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败';
  } finally {
    saving.value = false;
  }
}

function buildCodePreview(content: string) {
  const lines = content.split(/\r?\n/);
  const preview = lines.slice(0, 6).join('\n');
  if (lines.length > 6 || preview.length < content.length) {
    return `${preview}\n...`;
  }
  return preview;
}

async function confirmDelete() {
  if (!deleteTarget.value) {
    return;
  }
  try {
    await snippetsApi.delete(deleteTarget.value.id);
    snippets.value = snippets.value.filter((entry) => entry.id !== deleteTarget.value?.id);
    deleteTarget.value = null;
    uiStore.showToast('已删除');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '删除失败');
  }
}

async function copySnippet(snippet: SnippetRecord) {
  try {
    if (snippet.type === 'image') {
      const response = await fetch(snippet.content);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
      uiStore.showToast('图片已复制');
      return;
    }
    await navigator.clipboard.writeText(snippet.content);
    uiStore.showToast('已复制');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '复制失败');
  }
}
</script>

<template>
  <div class="v3-page">
    <section class="v3-card">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">片段库</h2>
          <p class="v3-muted">快速收集文本/代码/链接/图片。</p>
        </div>
        <div class="v3-inline-actions">
          <UiButton variant="tertiary" :disabled="loading" @click="loadAll">刷新</UiButton>
        </div>
      </div>

      <div class="v3-search-row">
        <div class="v3-chip-list">
          <button class="v3-chip" :class="{ active: filterType === 'all' }" @click="filterType = 'all'">全部</button>
          <button v-for="option in typeOptions" :key="option.key" class="v3-chip" :class="{ active: filterType === option.key }" @click="filterType = option.key">
            {{ option.label }}
          </button>
        </div>
        <input v-model="searchQuery" class="v3-search-input" placeholder="按标题或内容筛选..." />
      </div>
    </section>

    <section class="v3-card">
      <div class="v3-card-head">
        <h3 class="v3-card-title">快速收集</h3>
      </div>
      <div class="v3-list" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
        <UiField label="类型">
          <select v-model="draftType">
            <option v-for="option in typeOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
          </select>
        </UiField>
        <UiField label="标题">
          <input v-model="draftTitle" placeholder="可选，留空自动生成" />
        </UiField>
      </div>
      <UiField v-if="draftType !== 'image'" label="内容" :error="draftError" style="margin-top: 12px;">
        <textarea v-model="draftContent" rows="6" placeholder="输入内容" />
      </UiField>
      <UiField v-else label="图片内容" :error="draftError" style="margin-top: 12px;">
        <div class="v3-item">
          <div v-if="draftContent">
            <img :src="draftContent" alt="draft" style="max-height: 220px; max-width: 100%; border-radius: 10px;" />
          </div>
          <p v-else class="v3-muted">未选择图片，可读取剪贴板或上传图片。</p>
        </div>
      </UiField>
      <div class="v3-inline-actions" style="margin-top: 10px;">
        <UiButton variant="secondary" :disabled="clipboardBusy !== 'idle'" @click="readClipboardText">
          {{ clipboardBusy === 'text' ? '读取中...' : '读取文本' }}
        </UiButton>
        <UiButton variant="secondary" :disabled="clipboardBusy !== 'idle'" @click="readClipboardImage">
          {{ clipboardBusy === 'image' ? '读取中...' : '读取图片' }}
        </UiButton>
        <UiButton variant="secondary" @click="triggerImageUpload">上传图片</UiButton>
        <UiButton variant="primary" :loading="saving" :disabled="saving" @click="createSnippet">保存片段</UiButton>
      </div>
      <input ref="imageUploadInput" type="file" accept="image/*" style="display: none;" @change="handleImageUpload" />
      <p class="v3-muted" style="margin-top: 8px;">
        当前内容大小：{{ draftSizeText }}
      </p>
    </section>

    <section class="v3-card">
      <div class="v3-card-head">
        <h3 class="v3-card-title">结果列表</h3>
        <p class="v3-muted">{{ filtered.length }} 条</p>
      </div>

      <div v-if="loading" class="v3-muted">加载中...</div>
      <div v-else-if="errorMessage" class="v3-danger">{{ errorMessage }}</div>
      <div v-else-if="!filtered.length" class="v3-muted">暂无内容</div>
      <div v-else class="v3-list">
        <article
          v-for="snippet in filtered"
          :key="snippet.id"
          class="v3-item"
          :class="{ 'v3-highlight': highlightedId === snippet.id }"
          :data-snippet-id="snippet.id"
        >
          <div class="v3-card-head" style="margin-bottom: 6px;">
            <div>
              <strong>{{ snippet.title || '未命名片段' }}</strong>
              <p class="v3-muted">{{ snippet.type }} · {{ formatDateTime(snippet.updatedAt) }}</p>
            </div>
            <div class="v3-inline-actions">
              <UiButton size="sm" variant="tertiary" @click="togglePin(snippet)">
                {{ snippet.isPinned ? '取消置顶' : '置顶' }}
              </UiButton>
              <UiButton size="sm" variant="secondary" @click="copySnippet(snippet)">复制</UiButton>
              <UiButton size="sm" variant="secondary" @click="openEditDialog(snippet)">编辑</UiButton>
              <UiButton size="sm" variant="danger" @click="deleteTarget = snippet">删除</UiButton>
            </div>
          </div>
          <div v-if="snippet.type === 'image'">
            <img :src="snippet.content" alt="snippet" style="max-height: 180px; max-width: 100%; border-radius: 10px;" />
          </div>
          <pre v-else-if="snippet.type === 'code'" class="v3-code-preview">{{ buildCodePreview(snippet.content) }}</pre>
          <pre
            v-else-if="snippet.type !== 'code'"
            style="margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;"
          >{{ snippet.content }}</pre>
          <p v-if="snippet.type === 'code'" class="v3-muted">代码内容已折叠，可直接复制。</p>
        </article>
      </div>
    </section>

    <UiDialog
      :open="editDialogOpen"
      title="编辑片段"
      :description="editingSnippet ? `更新 ${editingSnippet.title || '片段'}` : ''"
      :confirm-loading="saving"
      :confirm-disabled="saving"
      confirm-text="保存"
      @close="editDialogOpen = false"
      @confirm="saveEdit"
    >
      <UiField label="类型" :error="errorMessage">
        <select v-model="editType">
          <option v-for="option in typeOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
        </select>
      </UiField>
      <UiField label="标题">
        <input v-model="editTitle" />
      </UiField>
      <UiField label="内容">
        <textarea v-if="editType !== 'image'" v-model="editContent" rows="8" />
        <div v-else class="v3-item">
          <div v-if="editContent">
            <img :src="editContent" alt="snippet-preview" style="max-height: 220px; max-width: 100%; border-radius: 10px;" />
          </div>
          <p v-else class="v3-muted">暂无图片内容</p>
        </div>
      </UiField>
    </UiDialog>

    <ConfirmModal
      :open="Boolean(deleteTarget)"
      title="删除片段"
      :message="`确认删除「${deleteTarget?.title || '未命名片段'}」？`"
      confirm-text="删除"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
