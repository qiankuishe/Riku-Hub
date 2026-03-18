<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { NavigationCategory, NavigationLink, NoteRecord, SnippetRecord } from '../../core/api';
import { navigationApi, notesApi, snippetsApi } from '../../core/api';
import { useUiStore } from '../../../src/stores/ui';
import UiButton from '../../../src/components/ui/UiButton.vue';
import UiDialog from '../../../src/components/ui/UiDialog.vue';
import UiField from '../../../src/components/ui/UiField.vue';
import CategoryDropZone from '../../modules/navigation/CategoryDropZone.vue';
import ConfirmModal from '../../modules/navigation/ConfirmModal.vue';
import LinkCard from '../../modules/navigation/LinkCard.vue';

type SearchEngine = 'google' | 'bing' | 'baidu' | 'github' | 'local';
type LocalSearchType = 'link' | 'note' | 'snippet';

interface LocalSearchItem {
  type: LocalSearchType;
  id: string;
  title: string;
  url?: string;
  desc: string;
}

const uiStore = useUiStore();

const categories = ref<NavigationCategory[]>([]);
const notes = ref<NoteRecord[]>([]);
const snippets = ref<SnippetRecord[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const selectedCategoryId = ref<string | null>(null);
const editMode = ref(false);

const searchEngine = ref<SearchEngine>('google');
const searchQuery = ref('');
const localSearchResults = ref<LocalSearchItem[]>([]);
const searching = ref(false);
let searchTimer: number | undefined;

const categoryDialogVisible = ref(false);
const editingCategory = ref<NavigationCategory | null>(null);
const categoryFormName = ref('');

const linkDialogVisible = ref(false);
const editingLink = ref<NavigationLink | null>(null);
const linkForm = ref({
  categoryId: '',
  title: '',
  url: '',
  description: ''
});

const deleteCategoryTarget = ref<NavigationCategory | null>(null);
const deleteLinkTarget = ref<NavigationLink | null>(null);

const draggingLinkId = ref('');
const dragSourceCategoryId = ref('');
const dropCategoryId = ref('');
const dropLinkId = ref('');
const dropPlacement = ref<'before' | 'after' | ''>('');

const overviewSectionId = 'v3-nav-overview';

const searchEngines: Record<SearchEngine, { name: string; url: string }> = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  github: { name: 'GitHub', url: 'https://github.com/search?q=' },
  local: { name: '站内', url: '' }
};

const totalLinks = computed(() => categories.value.reduce((sum, category) => sum + category.links.length, 0));
const hasCategories = computed(() => categories.value.length > 0);
const recentLinks = computed(() =>
  categories.value
    .flatMap((category) => category.links.map((link) => ({ ...link, categoryName: category.name })))
    .filter((link) => Boolean(link.lastVisitedAt))
    .sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? ''))
    .slice(0, 8)
);

watch(
  [categories, selectedCategoryId],
  () => {
    uiStore.setSecondaryNav({
      title: '导航分类',
      activeKey: selectedCategoryId.value ?? 'all',
      items: [
        {
          key: 'all',
          label: '全部',
          badge: String(totalLinks.value),
          targetId: overviewSectionId
        },
        ...categories.value.map((category) => ({
          key: category.id,
          label: category.name,
          badge: String(category.links.length),
          targetId: getCategorySectionId(category.id)
        }))
      ]
    });
    uiStore.expandSidebarSection('/nav');
  },
  { deep: true, immediate: true }
);

watch(searchQuery, () => {
  if (searchEngine.value !== 'local') {
    localSearchResults.value = [];
    return;
  }
  if (searchTimer) {
    window.clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    runLocalSearch();
  }, 280);
});

watch(searchEngine, (value) => {
  if (value !== 'local') {
    localSearchResults.value = [];
    return;
  }
  runLocalSearch();
});

onMounted(() => {
  uiStore.expandSidebarSection('/nav');
  void loadAll();
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
  if (searchTimer) {
    window.clearTimeout(searchTimer);
  }
});

function getCategorySectionId(categoryId: string) {
  return `v3-nav-category-${categoryId}`;
}

async function loadAll() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [navigation, notesData, snippetsData] = await Promise.all([
      navigationApi.getAll(),
      notesApi.getAll(),
      snippetsApi.getAll({ type: 'all' })
    ]);
    categories.value = navigation.categories;
    notes.value = notesData.notes;
    snippets.value = snippetsData.snippets;
    if (!selectedCategoryId.value || !categories.value.some((category) => category.id === selectedCategoryId.value)) {
      selectedCategoryId.value = categories.value[0]?.id ?? null;
    }
    if (searchEngine.value === 'local' && searchQuery.value.trim()) {
      runLocalSearch();
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function focusCategory(categoryId: string | null) {
  selectedCategoryId.value = categoryId;
  uiStore.setSecondaryNavActive(categoryId ?? 'all');
  if (!categoryId) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  document.getElementById(getCategorySectionId(categoryId))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleSearch() {
  const keyword = searchQuery.value.trim();
  if (!keyword) {
    return;
  }
  if (searchEngine.value === 'local') {
    runLocalSearch();
    return;
  }
  window.open(`${searchEngines[searchEngine.value].url}${encodeURIComponent(keyword)}`, '_blank', 'noopener,noreferrer');
}

function runLocalSearch() {
  const needle = searchQuery.value.trim().toLowerCase();
  if (!needle) {
    localSearchResults.value = [];
    return;
  }
  searching.value = true;
  const result: LocalSearchItem[] = [];
  categories.value.forEach((category) => {
    category.links.forEach((link) => {
      if (
        link.title.toLowerCase().includes(needle) ||
        link.description.toLowerCase().includes(needle) ||
        link.url.toLowerCase().includes(needle)
      ) {
        result.push({
          type: 'link',
          id: link.id,
          title: link.title,
          url: link.url,
          desc: `${category.name}${link.description ? ` · ${link.description}` : ''}`
        });
      }
    });
  });
  notes.value.forEach((note) => {
    if (note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle)) {
      result.push({
        type: 'note',
        id: note.id,
        title: note.title || '无标题',
        desc: note.content.replace(/\s+/g, ' ').slice(0, 68) || '空笔记'
      });
    }
  });
  snippets.value.forEach((snippet) => {
    const content = snippet.type === 'image' ? '[图片]' : snippet.content;
    if (snippet.title.toLowerCase().includes(needle) || content.toLowerCase().includes(needle)) {
      result.push({
        type: 'snippet',
        id: snippet.id,
        title: snippet.title || '未命名片段',
        desc: content.replace(/\s+/g, ' ').slice(0, 68)
      });
    }
  });
  localSearchResults.value = result.slice(0, 20);
  searching.value = false;
}

function openCategoryDialog(category?: NavigationCategory) {
  editingCategory.value = category ?? null;
  categoryFormName.value = category?.name ?? '';
  errorMessage.value = '';
  categoryDialogVisible.value = true;
}

async function saveCategory() {
  const name = categoryFormName.value.trim();
  if (!name) {
    errorMessage.value = '分类名称不能为空';
    return;
  }
  try {
    if (editingCategory.value) {
      await navigationApi.updateCategory(editingCategory.value.id, { name });
      uiStore.showToast('分类已更新');
    } else {
      await navigationApi.createCategory(name);
      uiStore.showToast('分类已创建');
    }
    categoryDialogVisible.value = false;
    await loadAll();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败';
  }
}

function openLinkDialog(link?: NavigationLink, categoryId?: string) {
  editingLink.value = link ?? null;
  linkForm.value = {
    categoryId: link?.categoryId ?? categoryId ?? categories.value[0]?.id ?? '',
    title: link?.title ?? '',
    url: link?.url ?? '',
    description: link?.description ?? ''
  };
  errorMessage.value = '';
  linkDialogVisible.value = true;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

async function saveLink() {
  if (!linkForm.value.categoryId || !linkForm.value.title.trim() || !linkForm.value.url.trim()) {
    errorMessage.value = '分类、名称、链接不能为空';
    return;
  }
  const payload = {
    categoryId: linkForm.value.categoryId,
    title: linkForm.value.title.trim(),
    url: normalizeUrl(linkForm.value.url),
    description: linkForm.value.description.trim()
  };
  try {
    if (editingLink.value) {
      await navigationApi.updateLink(editingLink.value.id, payload);
      uiStore.showToast('链接已更新');
    } else {
      await navigationApi.createLink(payload);
      uiStore.showToast('链接已创建');
    }
    linkDialogVisible.value = false;
    await loadAll();
    await nextTick();
    focusCategory(payload.categoryId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败';
  }
}

async function confirmDeleteCategory() {
  if (!deleteCategoryTarget.value) {
    return;
  }
  try {
    await navigationApi.deleteCategory(deleteCategoryTarget.value.id);
    uiStore.showToast('分类已删除');
    deleteCategoryTarget.value = null;
    await loadAll();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败';
  }
}

async function confirmDeleteLink() {
  if (!deleteLinkTarget.value) {
    return;
  }
  try {
    await navigationApi.deleteLink(deleteLinkTarget.value.id);
    uiStore.showToast('链接已删除');
    deleteLinkTarget.value = null;
    await loadAll();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败';
  }
}

async function handleOpenLink(link: NavigationLink) {
  window.open(link.url, '_blank', 'noopener,noreferrer');
  try {
    const result = await navigationApi.recordVisit(link.id);
    categories.value = categories.value.map((category) => ({
      ...category,
      links: category.links.map((entry) =>
        entry.id === link.id ? { ...entry, visitCount: result.visitCount, lastVisitedAt: result.lastVisitedAt } : entry
      )
    }));
  } catch {
    // noop
  }
}

async function handleLocalResultClick(item: LocalSearchItem) {
  if (item.type === 'link' && item.url) {
    const link = categories.value.flatMap((category) => category.links).find((entry) => entry.id === item.id);
    if (link) {
      await handleOpenLink(link);
      return;
    }
    window.open(item.url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (item.type === 'note') {
    window.location.assign(`/notes?focus=${encodeURIComponent(item.id)}`);
    return;
  }
  window.location.assign(`/snippets?focus=${encodeURIComponent(item.id)}`);
}

function getLink(categoryId: string, linkId: string) {
  return categories.value.find((entry) => entry.id === categoryId)?.links.find((entry) => entry.id === linkId) ?? null;
}

function onLinkDragStart(event: DragEvent, link: NavigationLink) {
  draggingLinkId.value = link.id;
  dragSourceCategoryId.value = link.categoryId;
  dropCategoryId.value = link.categoryId;
  dropLinkId.value = '';
  dropPlacement.value = '';
  event.dataTransfer?.setData('text/plain', link.id);
  event.dataTransfer!.effectAllowed = 'move';
}

function onLinkDragEnd() {
  draggingLinkId.value = '';
  dragSourceCategoryId.value = '';
  dropCategoryId.value = '';
  dropLinkId.value = '';
  dropPlacement.value = '';
}

function onLinkDragOver(event: DragEvent, link: NavigationLink) {
  const element = event.currentTarget as HTMLElement | null;
  const rect = element?.getBoundingClientRect();
  const after = rect
    ? event.clientY - rect.top > rect.height / 2 || event.clientX - rect.left > rect.width / 2
    : false;
  dropCategoryId.value = link.categoryId;
  dropLinkId.value = link.id;
  dropPlacement.value = after ? 'after' : 'before';
}

function onCategoryDragOver(_event: DragEvent, categoryId: string) {
  dropCategoryId.value = categoryId;
  dropLinkId.value = '';
  dropPlacement.value = '';
}

async function onLinkDrop(event: DragEvent, link: NavigationLink) {
  const element = event.currentTarget as HTMLElement | null;
  const rect = element?.getBoundingClientRect();
  const after = rect
    ? event.clientY - rect.top > rect.height / 2 || event.clientX - rect.left > rect.width / 2
    : dropPlacement.value === 'after';
  await performLinkDrop(link.categoryId, link.id, after);
}

async function onCategoryDropZone(_event: DragEvent, categoryId: string) {
  await performLinkDrop(categoryId, null, false);
}

async function performLinkDrop(targetCategoryId: string, targetLinkId: string | null, insertAfter: boolean) {
  const sourceLinkId = draggingLinkId.value;
  const sourceCategoryId = dragSourceCategoryId.value;
  if (!sourceLinkId || !sourceCategoryId) {
    onLinkDragEnd();
    return;
  }

  const sourceCategory = categories.value.find((category) => category.id === sourceCategoryId);
  const targetCategory = categories.value.find((category) => category.id === targetCategoryId);
  const sourceLink = getLink(sourceCategoryId, sourceLinkId);
  if (!sourceCategory || !targetCategory || !sourceLink) {
    onLinkDragEnd();
    return;
  }

  try {
    if (sourceCategoryId === targetCategoryId) {
      const ids = sourceCategory.links.map((entry) => entry.id).filter((id) => id !== sourceLinkId);
      const targetIndex = targetLinkId ? ids.indexOf(targetLinkId) : -1;
      const insertIndex = targetLinkId ? Math.max(0, targetIndex + (insertAfter ? 1 : 0)) : ids.length;
      ids.splice(insertIndex, 0, sourceLinkId);
      await navigationApi.reorderLinks(sourceCategoryId, ids);
      uiStore.showToast('链接排序已更新');
    } else {
      const sourceIds = sourceCategory.links.map((entry) => entry.id).filter((id) => id !== sourceLinkId);
      const targetIds = targetCategory.links.map((entry) => entry.id).filter((id) => id !== sourceLinkId);
      const targetIndex = targetLinkId ? targetIds.indexOf(targetLinkId) : -1;
      const insertIndex = targetLinkId ? Math.max(0, targetIndex + (insertAfter ? 1 : 0)) : targetIds.length;
      targetIds.splice(insertIndex, 0, sourceLinkId);

      await navigationApi.updateLink(sourceLinkId, { categoryId: targetCategoryId });
      await Promise.all([navigationApi.reorderLinks(sourceCategoryId, sourceIds), navigationApi.reorderLinks(targetCategoryId, targetIds)]);
      uiStore.showToast('链接已移动');
    }
    await loadAll();
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '拖拽操作失败');
    await loadAll();
  } finally {
    onLinkDragEnd();
  }
}
</script>

<template>
  <div class="v3-page">
    <section class="v3-card" :id="overviewSectionId">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">网站导航</h2>
          <p class="v3-muted">完整迁移导航体验，保留当前侧边栏机制。</p>
        </div>
        <div class="v3-nav-head-actions">
          <UiButton v-if="editMode" variant="secondary" @click="openCategoryDialog()">新增分类</UiButton>
          <div v-if="editMode" style="flex: 1;" />
          <UiButton v-if="editMode && hasCategories" variant="primary" @click="openLinkDialog()">新增站点</UiButton>
          <UiButton variant="tertiary" @click="editMode = !editMode">
            {{ editMode ? '完成编辑' : '进入编辑' }}
          </UiButton>
        </div>
      </div>

      <div class="v3-search-row">
        <div class="v3-chip-list">
          <button
            v-for="engine in Object.keys(searchEngines) as SearchEngine[]"
            :key="engine"
            class="v3-chip"
            :class="{ active: searchEngine === engine }"
            @click="searchEngine = engine"
          >
            {{ searchEngines[engine].name }}
          </button>
        </div>
        <input
          v-model="searchQuery"
          class="v3-search-input"
          :placeholder="searchEngine === 'local' ? '搜索站内内容...' : `搜索 ${searchEngines[searchEngine].name}...`"
          @keydown.enter.prevent="handleSearch"
        />
        <UiButton v-if="searchEngine !== 'local'" variant="primary" @click="handleSearch">搜索</UiButton>
      </div>

      <div v-if="searchEngine === 'local' && searchQuery.trim()" class="v3-card" style="margin-top: 12px; box-shadow: none;">
        <p class="v3-muted" style="margin-bottom: 8px;">
          {{ searching ? '搜索中...' : `找到 ${localSearchResults.length} 条结果` }}
        </p>
        <div class="v3-list">
          <button
            v-for="item in localSearchResults"
            :key="`${item.type}-${item.id}`"
            class="v3-item"
            style="text-align: left;"
            @click="handleLocalResultClick(item)"
          >
            <strong>{{ item.title }}</strong>
            <p class="v3-muted">{{ item.desc }}</p>
          </button>
          <div v-if="!localSearchResults.length && !searching" class="v3-item v3-muted">没有匹配内容</div>
        </div>
      </div>
    </section>

    <section v-if="!editMode && recentLinks.length && (searchEngine !== 'local' || !searchQuery.trim())" class="v3-card">
      <div class="v3-card-head">
        <h3 class="v3-card-title">最近访问</h3>
      </div>
      <div class="v3-link-grid">
        <LinkCard v-for="link in recentLinks" :key="link.id" :link="link" :edit-mode="false" @open="handleOpenLink" />
      </div>
    </section>

    <section v-if="loading" class="v3-card v3-muted">加载中...</section>
    <section v-else-if="errorMessage" class="v3-card v3-danger">{{ errorMessage }}</section>
    <section v-else-if="!categories.length" class="v3-card v3-muted">
      暂无分类。点击“新增分类”开始创建。
    </section>

    <template v-else>
      <CategoryDropZone
        v-for="category in categories"
        :key="category.id"
        :active="dropCategoryId === category.id"
        @dragover="onCategoryDragOver($event, category.id)"
        @drop="onCategoryDropZone($event, category.id)"
      >
        <section class="v3-card" :id="getCategorySectionId(category.id)">
          <div class="v3-card-head">
            <div>
              <h3 class="v3-card-title">
                {{ category.name }} <span class="v3-muted">({{ category.links.length }})</span>
              </h3>
            </div>
            <div v-if="editMode" class="v3-inline-actions">
              <UiButton size="sm" variant="secondary" @click="openLinkDialog(undefined, category.id)">新增链接</UiButton>
              <UiButton size="sm" variant="tertiary" @click="openCategoryDialog(category)">编辑分类</UiButton>
              <UiButton size="sm" variant="danger" @click="deleteCategoryTarget = category">删除分类</UiButton>
            </div>
          </div>

          <div class="v3-link-grid">
            <LinkCard
              v-for="link in category.links"
              :key="link.id"
              :link="link"
              :edit-mode="editMode"
              :dragging="draggingLinkId === link.id"
              :drop-target="dropLinkId === link.id"
              :drop-before="dropLinkId === link.id && dropPlacement === 'before'"
              :drop-after="dropLinkId === link.id && dropPlacement === 'after'"
              @open="handleOpenLink"
              @edit="openLinkDialog"
              @remove="deleteLinkTarget = $event"
              @dragstart="onLinkDragStart"
              @dragend="onLinkDragEnd"
              @dragover="onLinkDragOver"
              @drop="onLinkDrop"
            />

            <button v-if="editMode" class="v3-link-card" type="button" @click="openLinkDialog(undefined, category.id)">
              <div class="v3-link-main">
                <span class="v3-favicon-fallback">+</span>
                <div class="v3-link-title">添加链接</div>
              </div>
            </button>
          </div>
        </section>
      </CategoryDropZone>
    </template>

    <UiDialog
      :open="categoryDialogVisible"
      :title="editingCategory ? '编辑分类' : '新增分类'"
      :description="editingCategory ? '修改分类名称。' : '创建一个新的导航分类。'"
      confirm-text="保存"
      @close="categoryDialogVisible = false"
      @confirm="saveCategory"
    >
      <UiField label="分类名称" :error="errorMessage">
        <input v-model="categoryFormName" placeholder="分类名称" />
      </UiField>
    </UiDialog>

    <UiDialog
      :open="linkDialogVisible"
      :title="editingLink ? '编辑链接' : '新增链接'"
      :description="editingLink ? '更新网站信息。' : '添加一个新的网站链接。'"
      confirm-text="保存"
      @close="linkDialogVisible = false"
      @confirm="saveLink"
    >
      <UiField label="所属分类" :error="errorMessage">
        <select v-model="linkForm.categoryId">
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </UiField>
      <UiField label="网站名称">
        <input v-model="linkForm.title" placeholder="网站名称" />
      </UiField>
      <UiField label="网站地址">
        <input v-model="linkForm.url" placeholder="https://chatgpt.com/" />
      </UiField>
      <UiField label="网站备注">
        <input v-model="linkForm.description" placeholder="可选" />
      </UiField>
    </UiDialog>

    <ConfirmModal
      :open="Boolean(deleteCategoryTarget)"
      title="删除分类"
      :message="`确认删除分类「${deleteCategoryTarget?.name ?? ''}」？该分类下链接会一起删除。`"
      confirm-text="删除"
      @close="deleteCategoryTarget = null"
      @confirm="confirmDeleteCategory"
    />

    <ConfirmModal
      :open="Boolean(deleteLinkTarget)"
      title="删除链接"
      :message="`确认删除链接「${deleteLinkTarget?.title ?? ''}」？`"
      confirm-text="删除"
      @close="deleteLinkTarget = null"
      @confirm="confirmDeleteLink"
    />
  </div>
</template>
