<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import FaviconImage from '../../components/FaviconImage.vue';
import type { NavigationCategory, NavigationLink } from '../../api';
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
    errorMessage.value = error instanceof Error ? error.message : '保存分类失败';
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

function formatNavigationTitle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '未命名站点';
  }

  const hasCjk = /[\u3400-\u9fff]/.test(trimmed);
  const maxLength = hasCjk ? 9 : 16;
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}···`;
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
    errorMessage.value = '分类、标题和链接都不能为空';
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
    errorMessage.value = error instanceof Error ? error.message : '保存站点失败';
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
    errorMessage.value = error instanceof Error ? error.message : '删除分类失败';
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
    errorMessage.value = error instanceof Error ? error.message : '删除站点失败';
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
    <div class="nav-main-column">
      <div class="section-head nav-page-actions">
        <div />
        <div class="section-head-actions">
          <button v-if="isEditMode || !hasCategories" class="ghost" @click="openCategoryDialog()">
            新增分类
          </button>
          <button v-if="isEditMode && hasCategories" class="primary" @click="openLinkDialog()">
            新增站点
          </button>
          <button class="ghost" @click="isEditMode = !isEditMode">
            {{ isEditMode ? '退出编辑' : '进入编辑' }}
          </button>
        </div>
      </div>

      <section v-if="recentLinks.length" class="panel">
        <div class="section-head">
          <div>
            <h2>最近访问</h2>
          </div>
        </div>

        <div class="nav-recent-grid">
          <button v-for="link in recentLinks" :key="link.id" class="nav-recent-item" @click="openLink(link)">
            <FaviconImage :url="link.url" :title="link.title" class-name="nav-recent-favicon" />
            <div>
              <strong>{{ link.title }}</strong>
              <p>{{ link.categoryName }} · {{ formatRecentVisitedAt(link.lastVisitedAt ?? undefined) }}</p>
            </div>
          </button>
        </div>
      </section>

      <section class="nav-sections-panel">
        <div v-if="navigationStore.loading" class="panel">
          <div class="empty-state">正在加载导航数据...</div>
        </div>

        <div v-else-if="!hasCategories" class="panel">
          <div class="empty-state nav-empty-state">
            <strong>还没有导航分类</strong>
            <p>你可以先创建一个分类，再往里面添加站点。</p>
            <div class="dialog-actions">
              <button class="primary" @click="openCategoryDialog()">新增分类</button>
            </div>
          </div>
        </div>

        <div v-if="!navigationStore.loading && hasCategories && !hasLinks" class="panel">
          <div class="empty-state nav-empty-state">
            <strong>分类还在，但站点已经清空</strong>
            <p>现在可以直接新增站点，或者继续补新的分类。</p>
            <div class="dialog-actions">
              <button class="ghost" @click="openCategoryDialog()">新增分类</button>
              <button class="primary" @click="openLinkDialog()">新增站点</button>
            </div>
          </div>
        </div>

        <section
          v-for="category in navigationStore.categories"
          :id="getCategorySectionId(category.id)"
          :key="category.id"
          class="panel nav-category-panel"
        >
          <div class="section-head">
            <div>
              <h2>{{ category.name }}</h2>
            </div>
            <div v-if="isEditMode" class="nav-card-actions">
              <button class="ghost small" :disabled="navigationStore.saving || isFirstCategory(category)" @click="moveCategory(category, -1)">
                上移分类
              </button>
              <button class="ghost small" :disabled="navigationStore.saving || isLastCategory(category)" @click="moveCategory(category, 1)">
                下移分类
              </button>
              <button class="ghost small" :disabled="navigationStore.saving" @click="openCategoryDialog(category)">编辑分类</button>
              <button class="ghost danger small" :disabled="navigationStore.saving" @click="deleteCategoryTarget = category">删除分类</button>
              <button class="primary" @click="openLinkDialog(undefined, category.id)">新增站点</button>
            </div>
          </div>

          <div v-if="category.links.length === 0" class="empty-state">当前分类还没有站点。</div>
          <div v-else class="nav-card-grid nav-card-grid-compact">
            <article
              v-for="link in category.links"
              :key="link.id"
              class="nav-card nav-card-clickable"
              @click="!isEditMode && openLink(link)"
            >
              <div class="nav-card-head">
                <div class="nav-card-title">
                  <FaviconImage :url="link.url" :title="link.title" class-name="favicon-image" />
                  <div>
                    <h3 :title="link.title">{{ formatNavigationTitle(link.title) }}</h3>
                  </div>
                </div>
              </div>

              <div v-if="!isEditMode" class="nav-card-hover">
                <div class="nav-card-hover-meta">
                  <span>{{ link.visitCount || 0 }} 次访问</span>
                  <span>{{ formatDateTime(link.lastVisitedAt ?? undefined, '尚未访问') }}</span>
                </div>
                <p>{{ link.description || '暂无说明' }}</p>
              </div>

              <div v-if="isEditMode" class="nav-card-actions">
                <button class="ghost small" :disabled="navigationStore.saving || isFirstLink(link)" @click.stop="moveLink(link, -1)">上移</button>
                <button class="ghost small" :disabled="navigationStore.saving || isLastLink(link)" @click.stop="moveLink(link, 1)">下移</button>
                <button class="ghost small" :disabled="navigationStore.saving" @click.stop="openLinkDialog(link)">编辑</button>
                <button class="ghost danger small" :disabled="navigationStore.saving" @click.stop="deleteLinkTarget = link">删除</button>
              </div>
            </article>
          </div>
        </section>
      </section>
    </div>

    <div v-if="categoryDialogVisible" class="modal-backdrop" @click.self="categoryDialogVisible = false">
      <div class="modal-card compact-modal-card">
        <div class="section-head">
          <div>
            <h2>{{ editingCategory ? '编辑分类' : '新增分类' }}</h2>
          </div>
        </div>

        <label class="field">
          <span>分类名称</span>
          <input v-model="categoryFormName" placeholder="例如：开发工具" />
        </label>

        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>

        <div class="dialog-actions">
          <button class="ghost" @click="categoryDialogVisible = false">取消</button>
          <button class="primary" :disabled="navigationStore.saving" @click="saveCategory">
            {{ navigationStore.saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="linkDialogVisible" class="modal-backdrop" @click.self="linkDialogVisible = false">
      <div class="modal-card">
        <div class="section-head">
          <div>
            <h2>{{ editingLink ? '编辑站点' : '新增站点' }}</h2>
          </div>
        </div>

        <div class="editor-form">
          <label class="field">
            <span>所属分类</span>
            <select v-model="linkForm.categoryId" class="field-select">
              <option v-for="category in navigationStore.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>站点名称</span>
            <input v-model="linkForm.title" placeholder="例如：Cloudflare" />
          </label>

          <label class="field">
            <span>站点链接</span>
            <input v-model="linkForm.url" placeholder="example.com 或 https://example.com" />
          </label>

          <label class="field">
            <span>说明</span>
            <textarea v-model="linkForm.description" rows="4" placeholder="补充一句你自己看得懂的说明"></textarea>
          </label>
        </div>

        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>

        <div class="dialog-actions">
          <button class="ghost" @click="linkDialogVisible = false">取消</button>
          <button class="primary" :disabled="navigationStore.saving" @click="saveLink">
            {{ navigationStore.saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="deleteCategoryTarget" class="modal-backdrop" @click.self="deleteCategoryTarget = null">
      <div class="modal-card confirm-card">
        <div class="section-head">
          <div>
            <h2>确认删除分类</h2>
          </div>
        </div>
        <p class="confirm-text">确定删除「{{ deleteCategoryTarget.name }}」吗？</p>
        <div class="dialog-actions">
          <button class="ghost" @click="deleteCategoryTarget = null">取消</button>
          <button class="primary danger-fill" :disabled="navigationStore.saving" @click="confirmDeleteCategory">
            {{ navigationStore.saving ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="deleteLinkTarget" class="modal-backdrop" @click.self="deleteLinkTarget = null">
      <div class="modal-card confirm-card">
        <div class="section-head">
          <div>
            <h2>确认删除站点</h2>
          </div>
        </div>
        <p class="confirm-text">确定删除「{{ deleteLinkTarget.title }}」吗？</p>
        <div class="dialog-actions">
          <button class="ghost" @click="deleteLinkTarget = null">取消</button>
          <button class="primary danger-fill" :disabled="navigationStore.saving" @click="confirmDeleteLink">
            {{ navigationStore.saving ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
