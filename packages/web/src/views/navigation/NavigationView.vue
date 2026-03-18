<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { NavigationCategory, NavigationLink } from '../../api';
import FaviconImage from '../../components/FaviconImage.vue';
import UiButton from '../../components/ui/UiButton.vue';
import UiDialog from '../../components/ui/UiDialog.vue';
import UiEmptyState from '../../components/ui/UiEmptyState.vue';
import UiField from '../../components/ui/UiField.vue';
import UiSectionCard from '../../components/ui/UiSectionCard.vue';
import { useNavigationStore } from '../../stores/navigation';
import { useUiStore } from '../../stores/ui';
import { formatDateTime } from '../../utils/date';

const navigationStore = useNavigationStore();
const uiStore = useUiStore();

const activeCategoryId = ref<string | null>(null);
const isEditMode = ref(false);
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
const errorMessage = ref('');
const overviewSectionId = 'nav-overview-root';
const recentLinks = computed(() => navigationStore.recentLinks.slice(0, 8));
const hasCategories = computed(() => navigationStore.categories.length > 0);
const hasLinks = computed(() => navigationStore.totalLinks > 0);

watch(
  () => navigationStore.categories,
  (categories) => {
    if (!categories.length) {
      activeCategoryId.value = null;
      return;
    }
    if (activeCategoryId.value && !categories.some((category) => category.id === activeCategoryId.value)) {
      activeCategoryId.value = categories[0].id;
    }
  },
  { deep: true, immediate: true }
);

watch(
  [() => navigationStore.categories, activeCategoryId],
  ([categories, activeId]) => {
    uiStore.setSecondaryNav({
      title: '导航分类',
      activeKey: activeId ?? 'all',
      items: [
        {
          key: 'all',
          label: '全部',
          badge: String(navigationStore.totalLinks),
          targetId: overviewSectionId
        },
        ...categories.map((category) => ({
          key: category.id,
          label: category.name,
          badge: String(category.links.length),
          targetId: getCategorySectionId(category.id)
        }))
      ]
    });
  },
  { deep: true, immediate: true }
);

onMounted(async () => {
  await navigationStore.loadAll();
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
});

function getCategorySectionId(categoryId: string) {
  return `nav-category-${categoryId}`;
}

function focusCategory(categoryId: string | null) {
  activeCategoryId.value = categoryId;
  uiStore.setSecondaryNavActive(categoryId ?? 'all');
  if (categoryId === null) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  document.getElementById(getCategorySectionId(categoryId))?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function openCategoryDialog(category?: NavigationCategory) {
  editingCategory.value = category ?? null;
  categoryFormName.value = category?.name ?? '';
  errorMessage.value = '';
  categoryDialogVisible.value = true;
}

async function saveCategory() {
  if (!categoryFormName.value.trim()) {
    errorMessage.value = '分类名称不能为空';
    return;
  }

  errorMessage.value = '';
  try {
    if (editingCategory.value) {
      const category = await navigationStore.updateCategory(editingCategory.value.id, categoryFormName.value.trim());
      activeCategoryId.value = category.id;
      uiStore.showToast('分类已更新');
    } else {
      const category = await navigationStore.createCategory(categoryFormName.value.trim());
      activeCategoryId.value = category.id;
      uiStore.showToast('分类已创建');
      await nextTick();
      focusCategory(category.id);
    }
    categoryDialogVisible.value = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败';
  }
}

function openLinkDialog(link?: NavigationLink, categoryId?: string) {
  editingLink.value = link ?? null;
  linkForm.value = {
    categoryId: link?.categoryId ?? categoryId ?? activeCategoryId.value ?? navigationStore.categories[0]?.id ?? '',
    title: link?.title ?? '',
    url: link?.url ?? '',
    description: link?.description ?? ''
  };
  errorMessage.value = '';
  linkDialogVisible.value = true;
}

function normalizeNavigationUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getLinkHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function formatRecentVisitedAt(value: string | undefined) {
  if (!value) {
    return '刚刚';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

async function saveLink() {
  if (!linkForm.value.categoryId || !linkForm.value.title.trim() || !linkForm.value.url.trim()) {
    errorMessage.value = '分类、名称和链接不能为空';
    return;
  }

  const normalizedUrl = normalizeNavigationUrl(linkForm.value.url);
  errorMessage.value = '';
  try {
    if (editingLink.value) {
      await navigationStore.updateLink(editingLink.value.id, {
        categoryId: linkForm.value.categoryId,
        title: linkForm.value.title.trim(),
        url: normalizedUrl,
        description: linkForm.value.description.trim()
      });
      uiStore.showToast('站点已更新');
    } else {
      await navigationStore.createLink({
        categoryId: linkForm.value.categoryId,
        title: linkForm.value.title.trim(),
        url: normalizedUrl,
        description: linkForm.value.description.trim()
      });
      uiStore.showToast('站点已创建');
    }
    activeCategoryId.value = linkForm.value.categoryId;
    linkDialogVisible.value = false;
    await nextTick();
    focusCategory(linkForm.value.categoryId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败';
  }
}

function moveCategory(category: NavigationCategory, direction: -1 | 1) {
  const list = [...navigationStore.categories];
  const index = list.findIndex((item) => item.id === category.id);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= list.length) {
    return;
  }
  const [item] = list.splice(index, 1);
  list.splice(targetIndex, 0, item);
  void navigationStore.reorderCategories(list.map((entry) => entry.id)).then(() => {
    uiStore.showToast(direction < 0 ? '分类已上移' : '分类已下移');
  });
}

function moveLink(link: NavigationLink, direction: -1 | 1) {
  const category = navigationStore.getCategory(link.categoryId);
  if (!category) {
    return;
  }
  const links = [...category.links];
  const index = links.findIndex((item) => item.id === link.id);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= links.length) {
    return;
  }
  const [item] = links.splice(index, 1);
  links.splice(targetIndex, 0, item);
  void navigationStore.reorderLinks(link.categoryId, links.map((entry) => entry.id)).then(() => {
    uiStore.showToast(direction < 0 ? '站点已上移' : '站点已下移');
  });
}

async function confirmDeleteCategory() {
  if (!deleteCategoryTarget.value) {
    return;
  }
  try {
    await navigationStore.deleteCategory(deleteCategoryTarget.value.id);
    deleteCategoryTarget.value = null;
    uiStore.showToast('分类已删除');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败';
  }
}

async function confirmDeleteLink() {
  if (!deleteLinkTarget.value) {
    return;
  }
  try {
    await navigationStore.deleteLink(deleteLinkTarget.value.id);
    deleteLinkTarget.value = null;
    uiStore.showToast('站点已删除');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败';
  }
}

function isFirstCategory(category: NavigationCategory) {
  return navigationStore.categories[0]?.id === category.id;
}

function isLastCategory(category: NavigationCategory) {
  return navigationStore.categories.at(-1)?.id === category.id;
}

function isFirstLink(link: NavigationLink) {
  const category = navigationStore.getCategory(link.categoryId);
  return category?.links[0]?.id === link.id;
}

function isLastLink(link: NavigationLink) {
  const category = navigationStore.getCategory(link.categoryId);
  return category?.links.at(-1)?.id === link.id;
}

async function openLink(link: NavigationLink) {
  window.open(link.url, '_blank', 'noopener,noreferrer');
  try {
    await navigationStore.recordVisit(link.id);
  } catch {
    // ignore visit logging failures
  }
}
</script>

<template>
  <div :id="overviewSectionId" class="page-shell page-shell-wide">
    <UiSectionCard class="nav-toolbar-card">
      <div class="section-head nav-page-actions">
        <div>
          <h2>网站导航</h2>
          <p class="section-subtitle">统一管理分组、链接和访问记录。</p>
        </div>
        <div class="section-head-actions">
          <!-- 编辑模式下，左侧显示新增分类 -->
          <UiButton v-if="isEditMode" variant="secondary" @click="openCategoryDialog()">
            新增分类
          </UiButton>
          
          <!-- 使用 spacer 推到右侧 -->
          <div v-if="isEditMode" style="flex: 1"></div>
          
          <!-- 右侧按钮组 -->
          <UiButton v-if="isEditMode && hasCategories" variant="primary" @click="openLinkDialog()">
            新增站点
          </UiButton>
          <UiButton variant="tertiary" @click="isEditMode = !isEditMode">
            {{ isEditMode ? '完成编辑' : '进入编辑' }}
          </UiButton>
        </div>
      </div>
    </UiSectionCard>

    <UiSectionCard v-if="recentLinks.length" title="最近访问" subtitle="最近打开的链接会出现在这里。">
      <div class="nav-link-list">
        <article v-for="link in recentLinks" :key="link.id" class="nav-link-row nav-link-row--recent" @click="openLink(link)">
          <div class="nav-link-main">
            <FaviconImage :url="link.url" :title="link.title" class-name="nav-recent-favicon" />
            <div class="nav-link-copy">
              <strong>{{ link.title }}</strong>
              <p>{{ link.categoryName }} · {{ formatRecentVisitedAt(link.lastVisitedAt ?? undefined) }}</p>
            </div>
          </div>
          <span class="inline-status">{{ getLinkHost(link.url) }}</span>
        </article>
      </div>
    </UiSectionCard>

    <section class="nav-sections-panel">
      <UiSectionCard v-if="navigationStore.loading">
        <UiEmptyState title="正在加载导航数据" description="请稍候片刻..." />
      </UiSectionCard>

      <UiSectionCard v-else-if="!hasCategories">
        <UiEmptyState title="还没有导航分类" description="先创建一个分类，再添加站点。">
          <UiButton variant="primary" @click="openCategoryDialog()">新增分类</UiButton>
        </UiEmptyState>
      </UiSectionCard>

      <UiSectionCard v-if="!navigationStore.loading && hasCategories && !hasLinks">
        <UiEmptyState title="分类还在，但站点为空" description="可以直接添加站点，或者继续补新的分类。">
          <UiButton variant="secondary" @click="openCategoryDialog()">新增分类</UiButton>
          <UiButton variant="primary" @click="openLinkDialog()">新增站点</UiButton>
        </UiEmptyState>
      </UiSectionCard>

      <UiSectionCard
        v-for="category in navigationStore.categories"
        :id="getCategorySectionId(category.id)"
        :key="category.id"
        :title="category.name"
        class="nav-category-panel"
      >
        <template v-if="isEditMode">
          <div class="nav-link-actions nav-category-actions">
            <UiButton variant="tertiary" size="sm" :disabled="navigationStore.saving || isFirstCategory(category)" @click="moveCategory(category, -1)">
              上移分类
            </UiButton>
            <UiButton variant="tertiary" size="sm" :disabled="navigationStore.saving || isLastCategory(category)" @click="moveCategory(category, 1)">
              下移分类
            </UiButton>
            <UiButton variant="tertiary" size="sm" :disabled="navigationStore.saving" @click="openCategoryDialog(category)">
              编辑分类
            </UiButton>
            <UiButton variant="danger" size="sm" :disabled="navigationStore.saving" @click="deleteCategoryTarget = category">
              删除分类
            </UiButton>
            <UiButton variant="primary" size="sm" @click="openLinkDialog(undefined, category.id)">
              新增站点
            </UiButton>
          </div>
        </template>

        <UiEmptyState
          v-if="category.links.length === 0"
          title="当前分类还没有站点"
          description="添加一个站点后会显示在这里。"
        />

        <div v-else class="nav-link-list">
          <article
            v-for="link in category.links"
            :key="link.id"
            class="nav-link-row"
            :class="{ 'nav-link-row--interactive': !isEditMode }"
          >
            <div class="nav-link-main" @click="!isEditMode && openLink(link)">
              <FaviconImage :url="link.url" :title="link.title" class-name="nav-recent-favicon" />
              <div class="nav-link-copy">
                <strong>{{ link.title }}</strong>
                <p>{{ link.description || '暂无备注' }}</p>
                <small>{{ getLinkHost(link.url) }} · {{ formatDateTime(link.lastVisitedAt ?? undefined, '尚未访问') }}</small>
              </div>
            </div>

            <div class="nav-link-actions">
              <UiButton v-if="!isEditMode" variant="tertiary" size="sm" @click.stop="openLink(link)">打开</UiButton>
              <template v-else>
                <UiButton variant="tertiary" size="sm" :disabled="navigationStore.saving || isFirstLink(link)" @click.stop="moveLink(link, -1)">
                  上移
                </UiButton>
                <UiButton variant="tertiary" size="sm" :disabled="navigationStore.saving || isLastLink(link)" @click.stop="moveLink(link, 1)">
                  下移
                </UiButton>
                <UiButton variant="tertiary" size="sm" :disabled="navigationStore.saving" @click.stop="openLinkDialog(link)">
                  编辑
                </UiButton>
                <UiButton variant="danger" size="sm" :disabled="navigationStore.saving" @click.stop="deleteLinkTarget = link">
                  删除
                </UiButton>
              </template>
            </div>
          </article>
        </div>
      </UiSectionCard>
    </section>

    <UiDialog
      :open="categoryDialogVisible"
      :title="editingCategory ? '编辑分类' : '新增分类'"
      confirm-text="保存"
      :confirm-loading="navigationStore.saving"
      :confirm-disabled="navigationStore.saving"
      @close="categoryDialogVisible = false"
      @confirm="saveCategory"
    >
      <UiField label="分类名称">
        <input v-model="categoryFormName" placeholder="例如：开发工具" @keydown.enter="saveCategory" />
      </UiField>
      <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
    </UiDialog>

    <UiDialog
      :open="linkDialogVisible"
      :title="editingLink ? '编辑站点' : '新增站点'"
      confirm-text="保存"
      :confirm-loading="navigationStore.saving"
      :confirm-disabled="navigationStore.saving"
      @close="linkDialogVisible = false"
      @confirm="saveLink"
    >
      <div class="editor-form">
        <UiField label="所属分类">
          <select v-model="linkForm.categoryId" class="field-select">
            <option v-for="category in navigationStore.categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </UiField>

        <UiField label="站点名称">
          <input v-model="linkForm.title" placeholder="例如：Cloudflare" />
        </UiField>

        <UiField label="站点链接">
          <input v-model="linkForm.url" placeholder="example.com 或 https://example.com" />
        </UiField>

        <UiField label="备注">
          <textarea v-model="linkForm.description" rows="4" placeholder="补充一句便于识别的说明"></textarea>
        </UiField>
      </div>
      <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
    </UiDialog>

    <UiDialog
      :open="Boolean(deleteCategoryTarget)"
      tone="danger"
      title="确认删除分类"
      :description="`确定删除「${deleteCategoryTarget?.name ?? ''}」吗？`"
      confirm-text="删除"
      :confirm-loading="navigationStore.saving"
      :confirm-disabled="navigationStore.saving"
      @close="deleteCategoryTarget = null"
      @confirm="confirmDeleteCategory"
    />

    <UiDialog
      :open="Boolean(deleteLinkTarget)"
      tone="danger"
      title="确认删除站点"
      :description="`确定删除「${deleteLinkTarget?.title ?? ''}」吗？`"
      confirm-text="删除"
      :confirm-loading="navigationStore.saving"
      :confirm-disabled="navigationStore.saving"
      @close="deleteLinkTarget = null"
      @confirm="confirmDeleteLink"
    />
  </div>
</template>
