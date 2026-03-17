<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import FaviconImage from '../../components/FaviconImage.vue';
import type { NavigationCategory, NavigationLink } from '../../api';
import { useNavigationStore } from '../../stores/navigation';
import { useUiStore } from '../../stores/ui';

const navigationStore = useNavigationStore();
const uiStore = useUiStore();

const activeCategoryId = ref<string | null>(null);
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

const activeCategory = computed(() => {
  if (!activeCategoryId.value) {
    return navigationStore.categories[0] ?? null;
  }
  return navigationStore.getCategory(activeCategoryId.value);
});

watch(
  () => navigationStore.categories,
  (categories) => {
    if (!categories.length) {
      activeCategoryId.value = null;
      return;
    }
    if (!activeCategoryId.value || !categories.some((category) => category.id === activeCategoryId.value)) {
      activeCategoryId.value = categories[0].id;
    }
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  void navigationStore.loadAll();
});

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
    }
    categoryDialogVisible.value = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存分类失败';
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

function openLinkDialog(link?: NavigationLink) {
  editingLink.value = link ?? null;
  linkForm.value = {
    categoryId: link?.categoryId ?? activeCategory.value?.id ?? navigationStore.categories[0]?.id ?? '',
    title: link?.title ?? '',
    url: link?.url ?? '',
    description: link?.description ?? ''
  };
  errorMessage.value = '';
  linkDialogVisible.value = true;
}

async function saveLink() {
  if (!linkForm.value.categoryId || !linkForm.value.title.trim() || !linkForm.value.url.trim()) {
    errorMessage.value = '分类、标题和链接都不能为空';
    return;
  }

  errorMessage.value = '';
  try {
    if (editingLink.value) {
      await navigationStore.updateLink(editingLink.value.id, {
        categoryId: linkForm.value.categoryId,
        title: linkForm.value.title.trim(),
        url: linkForm.value.url.trim(),
        description: linkForm.value.description.trim()
      });
      uiStore.showToast('站点已更新');
    } else {
      await navigationStore.createLink({
        categoryId: linkForm.value.categoryId,
        title: linkForm.value.title.trim(),
        url: linkForm.value.url.trim(),
        description: linkForm.value.description.trim()
      });
      uiStore.showToast('站点已创建');
    }
    activeCategoryId.value = linkForm.value.categoryId;
    linkDialogVisible.value = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存站点失败';
  }
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
</script>

<template>
  <div class="page-shell page-shell-wide">
    <section class="panel nav-hero-panel">
      <div class="section-head">
        <div>
          <h2>网站导航</h2>
          <p class="section-subtitle">保留当前聚合项目的视觉风格，把导航能力作为统一后台的默认首页。</p>
        </div>
        <button class="primary" @click="openCategoryDialog()">新增分类</button>
      </div>

      <div class="nav-hero-grid">
        <div class="metric-card">
          <span>分类数量</span>
          <strong>{{ navigationStore.categories.length }}</strong>
        </div>
        <div class="metric-card">
          <span>站点数量</span>
          <strong>{{ navigationStore.totalLinks }}</strong>
        </div>
        <div class="metric-card">
          <span>图标机制</span>
          <strong>多源拉取 + 本地缓存</strong>
        </div>
        <div class="metric-card">
          <span>数据存储</span>
          <strong>Worker + KV</strong>
        </div>
      </div>
    </section>

    <div class="nav-workspace">
      <section class="panel nav-sidebar-panel">
        <div class="section-head">
          <div>
            <h2>分类</h2>
            <p class="section-subtitle">局部二级栏用于快速切换导航分组。</p>
          </div>
        </div>

        <div v-if="navigationStore.categories.length === 0" class="empty-state">暂无分类。</div>
        <div v-else class="nav-section-sidebar">
          <button
            v-for="category in navigationStore.categories"
            :key="category.id"
            class="nav-section-link"
            :class="{ 'nav-section-link-active': category.id === activeCategoryId }"
            @click="activeCategoryId = category.id"
          >
            <div class="nav-section-row">
              <strong>{{ category.name }}</strong>
              <span>{{ category.links.length }} 项</span>
            </div>
            <div class="nav-item-actions">
              <button class="ghost small" :disabled="navigationStore.saving || isFirstCategory(category)" @click.stop="moveCategory(category, -1)">上移</button>
              <button class="ghost small" :disabled="navigationStore.saving || isLastCategory(category)" @click.stop="moveCategory(category, 1)">下移</button>
              <button class="ghost small" :disabled="navigationStore.saving" @click.stop="openCategoryDialog(category)">编辑</button>
              <button class="ghost danger small" :disabled="navigationStore.saving" @click.stop="deleteCategoryTarget = category">删除</button>
            </div>
          </button>
        </div>
      </section>

      <section class="panel nav-grid-panel">
        <div class="section-head">
          <div>
            <h2>{{ activeCategory?.name || '站点列表' }}</h2>
            <p class="section-subtitle">站点图标会优先从多个源拉取，并在浏览器本地缓存。</p>
          </div>
          <button class="primary" :disabled="!activeCategory" @click="openLinkDialog()">
            新增站点
          </button>
        </div>

        <div v-if="!activeCategory" class="empty-state">请先创建分类。</div>
        <div v-else-if="activeCategory.links.length === 0" class="empty-state">当前分类还没有站点。</div>
        <div v-else class="nav-card-grid">
          <article v-for="link in activeCategory.links" :key="link.id" class="nav-card">
            <div class="nav-card-head">
              <div class="nav-card-title">
                <FaviconImage :url="link.url" :title="link.title" class-name="favicon-image" />
                <div>
                  <h3>{{ link.title }}</h3>
                  <p class="nav-link-url">{{ link.url }}</p>
                </div>
              </div>
              <a :href="link.url" target="_blank" rel="noreferrer">打开</a>
            </div>

            <p>{{ link.description || '暂无说明' }}</p>

            <div class="nav-card-actions">
              <button class="ghost small" :disabled="navigationStore.saving || isFirstLink(link)" @click="moveLink(link, -1)">上移</button>
              <button class="ghost small" :disabled="navigationStore.saving || isLastLink(link)" @click="moveLink(link, 1)">下移</button>
              <button class="ghost small" :disabled="navigationStore.saving" @click="openLinkDialog(link)">编辑</button>
              <button class="ghost danger small" :disabled="navigationStore.saving" @click="deleteLinkTarget = link">删除</button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="categoryDialogVisible" class="modal-backdrop" @click.self="categoryDialogVisible = false">
      <div class="modal-card compact-modal-card">
        <div class="section-head">
          <div>
            <h2>{{ editingCategory ? '编辑分类' : '新增分类' }}</h2>
            <p class="section-subtitle">分类会出现在导航模块内的左侧二级栏。</p>
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
            <p class="section-subtitle">这里先保留导航主能力，后续再继续扩搜索、统计和收藏体验。</p>
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
            <input v-model="linkForm.url" placeholder="https://example.com" />
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
            <p class="section-subtitle">删除分类时会连同该分类下的站点一起删除。</p>
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
            <p class="section-subtitle">删除后可以重新添加，但当前排序位置会丢失。</p>
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
