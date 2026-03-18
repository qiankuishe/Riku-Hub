<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { Source, SubInfo, ValidationResult } from '../../core/api';
import { sourcesApi, subApi } from '../../core/api';
import UiButton from '../../../src/components/ui/UiButton.vue';
import UiDialog from '../../../src/components/ui/UiDialog.vue';
import UiField from '../../../src/components/ui/UiField.vue';
import ConfirmModal from '../../modules/navigation/ConfirmModal.vue';
import { formatDateTime } from '../../core/format';
import { useUiStore } from '../../../src/stores/ui';

const uiStore = useUiStore();

const sources = ref<Source[]>([]);
const subInfo = ref<SubInfo | null>(null);
const lastSaveTime = ref('');
const loading = ref(false);
const saving = ref(false);
const refreshing = ref(false);
const errorMessage = ref('');

const editorOpen = ref(false);
const editingSource = ref<Source | null>(null);
const formName = ref('');
const formContent = ref('');
const validation = ref<ValidationResult | null>(null);
const validating = ref(false);
const qrDialogVisible = ref(false);
const qrTitle = ref('');
const qrDataUrl = ref('');
const deleteTarget = ref<Source | null>(null);

let validateTimer = 0;
let validateRunId = 0;

const cacheStatusText = computed(() => {
  if (!subInfo.value) {
    return '未加载';
  }
  const map: Record<string, string> = {
    fresh: '缓存有效',
    stale: '缓存较旧',
    missing: '未生成缓存'
  };
  return map[subInfo.value.cacheStatus] ?? subInfo.value.cacheStatus;
});

watch(formContent, () => {
  if (!editorOpen.value) {
    return;
  }
  if (validateTimer) {
    window.clearTimeout(validateTimer);
  }
  validateTimer = window.setTimeout(() => {
    void runValidate();
  }, 300);
});

onMounted(() => {
  void loadPageData();
});

async function loadPageData() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [sourceData, subData] = await Promise.all([sourcesApi.getAll(), subApi.getInfo()]);
    sources.value = sourceData.sources;
    lastSaveTime.value = sourceData.lastSaveTime;
    subInfo.value = subData;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

async function refreshAggregation() {
  refreshing.value = true;
  try {
    const [sourceData, subData] = await Promise.all([sourcesApi.refresh(), subApi.getInfo()]);
    sources.value = sourceData.sources;
    lastSaveTime.value = sourceData.lastSaveTime;
    subInfo.value = subData;
    uiStore.showToast('聚合缓存已刷新');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '刷新失败');
  } finally {
    refreshing.value = false;
  }
}

function openCreateDialog() {
  editingSource.value = null;
  formName.value = '';
  formContent.value = '';
  validation.value = null;
  editorOpen.value = true;
}

function openEditDialog(source: Source) {
  editingSource.value = source;
  formName.value = source.name;
  formContent.value = source.content;
  validation.value = null;
  editorOpen.value = true;
}

function closeEditor() {
  editorOpen.value = false;
  errorMessage.value = '';
  validation.value = null;
  validating.value = false;
}

async function runValidate() {
  const content = formContent.value.trim();
  if (!content) {
    validation.value = null;
    return;
  }

  const runId = ++validateRunId;
  validating.value = true;
  try {
    const result = await sourcesApi.validate(content);
    if (runId !== validateRunId) {
      return;
    }
    validation.value = result;
  } catch (error) {
    if (runId !== validateRunId) {
      return;
    }
    validation.value = null;
    errorMessage.value = error instanceof Error ? error.message : '校验失败';
  } finally {
    if (runId === validateRunId) {
      validating.value = false;
    }
  }
}

async function saveSource() {
  if (!formName.value.trim() || !formContent.value.trim()) {
    errorMessage.value = '名称和内容不能为空';
    return;
  }

  saving.value = true;
  errorMessage.value = '';
  try {
    if (editingSource.value) {
      const result = await sourcesApi.update(editingSource.value.id, {
        name: formName.value.trim(),
        content: formContent.value.trim()
      });
      lastSaveTime.value = result.lastSaveTime;
      uiStore.showToast('订阅源已更新');
    } else {
      const result = await sourcesApi.create(formName.value.trim(), formContent.value.trim());
      lastSaveTime.value = result.lastSaveTime;
      uiStore.showToast('订阅源已创建');
    }
    closeEditor();
    await loadPageData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败';
  } finally {
    saving.value = false;
  }
}

async function moveSource(source: Source, direction: -1 | 1) {
  const list = [...sources.value];
  const index = list.findIndex((entry) => entry.id === source.id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= list.length) {
    return;
  }
  const [item] = list.splice(index, 1);
  list.splice(next, 0, item);

  try {
    const result = await sourcesApi.reorder(list.map((entry) => entry.id));
    lastSaveTime.value = result.lastSaveTime;
    sources.value = list;
    uiStore.showToast(direction < 0 ? '已上移' : '已下移');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '排序失败');
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) {
    return;
  }
  saving.value = true;
  try {
    const result = await sourcesApi.delete(deleteTarget.value.id);
    lastSaveTime.value = result.lastSaveTime;
    deleteTarget.value = null;
    await loadPageData();
    uiStore.showToast('订阅源已删除');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '删除失败');
  } finally {
    saving.value = false;
  }
}

async function copyLink(url: string) {
  await navigator.clipboard.writeText(url);
  uiStore.showToast('已复制');
}

async function openQr(name: string, url: string) {
  const { toDataURL } = await import('qrcode');
  qrTitle.value = name;
  qrDataUrl.value = await toDataURL(url, { width: 280, margin: 1 });
  qrDialogVisible.value = true;
}
</script>

<template>
  <div class="v3-page">
    <section class="v3-card">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">订阅聚合</h2>
          <p class="v3-muted">统一管理订阅源并输出多格式链接。</p>
        </div>
        <div class="v3-inline-actions">
          <UiButton variant="primary" @click="openCreateDialog">新增订阅源</UiButton>
          <UiButton variant="tertiary" :disabled="refreshing" @click="refreshAggregation">
            {{ refreshing ? '刷新中...' : '刷新缓存' }}
          </UiButton>
        </div>
      </div>

      <div class="v3-list" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
        <div class="v3-item">
          <strong>总节点</strong>
          <p class="v3-muted">{{ subInfo?.totalNodes ?? 0 }}</p>
        </div>
        <div class="v3-item">
          <strong>缓存状态</strong>
          <p class="v3-muted">{{ cacheStatusText }}</p>
        </div>
        <div class="v3-item">
          <strong>最近保存</strong>
          <p class="v3-muted">{{ lastSaveTime ? formatDateTime(lastSaveTime) : '-' }}</p>
        </div>
      </div>

      <div class="v3-list" style="margin-top: 12px;">
        <article v-for="format in subInfo?.formats ?? []" :key="format.key" class="v3-item">
          <div class="v3-card-head" style="margin-bottom: 6px;">
            <strong>{{ format.name }}</strong>
            <div class="v3-inline-actions">
              <UiButton size="sm" variant="secondary" @click="copyLink(format.url)">复制</UiButton>
              <UiButton size="sm" variant="tertiary" @click="openQr(format.name, format.url)">二维码</UiButton>
            </div>
          </div>
          <p class="v3-muted" style="word-break: break-all;">{{ format.url }}</p>
        </article>
      </div>
    </section>

    <section class="v3-card">
      <div class="v3-card-head">
        <h3 class="v3-card-title">订阅源列表</h3>
      </div>

      <div v-if="loading" class="v3-muted">加载中...</div>
      <div v-else-if="errorMessage" class="v3-danger">{{ errorMessage }}</div>
      <div v-else-if="!sources.length" class="v3-muted">暂无订阅源</div>
      <div v-else class="v3-list">
        <article v-for="source in sources" :key="source.id" class="v3-item">
          <div class="v3-card-head" style="margin-bottom: 4px;">
            <strong>{{ source.name }}</strong>
            <div class="v3-inline-actions">
              <UiButton size="sm" variant="tertiary" @click="moveSource(source, -1)">上移</UiButton>
              <UiButton size="sm" variant="tertiary" @click="moveSource(source, 1)">下移</UiButton>
              <UiButton size="sm" variant="secondary" @click="openEditDialog(source)">编辑</UiButton>
              <UiButton size="sm" variant="danger" @click="deleteTarget = source">删除</UiButton>
            </div>
          </div>
          <p class="v3-muted">节点数 {{ source.nodeCount }} · 更新于 {{ formatDateTime(source.updatedAt) }}</p>
        </article>
      </div>
    </section>

    <UiDialog
      :open="editorOpen"
      :title="editingSource ? '编辑订阅源' : '新增订阅源'"
      :description="editingSource ? '修改名称和内容。' : '输入源名称与链接内容。'"
      :confirm-loading="saving"
      :confirm-disabled="saving"
      confirm-text="保存"
      @close="closeEditor"
      @confirm="saveSource"
    >
      <UiField label="名称" :error="errorMessage">
        <input v-model="formName" placeholder="订阅源名称" />
      </UiField>
      <UiField label="内容" :help="validating ? '校验中...' : ''">
        <textarea v-model="formContent" rows="10" placeholder="订阅内容..." />
      </UiField>
      <div v-if="validation" class="v3-item">
        <p class="v3-muted">
          URL {{ validation.urlCount }} / 节点 {{ validation.nodeCount }} / 总数 {{ validation.totalCount }} /
          重复 {{ validation.duplicateCount }}
        </p>
      </div>
    </UiDialog>

    <UiDialog
      :open="qrDialogVisible"
      title="订阅二维码"
      :description="qrTitle"
      confirm-text="关闭"
      cancel-text="关闭"
      @close="qrDialogVisible = false"
      @confirm="qrDialogVisible = false"
    >
      <div style="display: grid; place-items: center;">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="订阅二维码" style="width: 260px; height: 260px;" />
      </div>
    </UiDialog>

    <ConfirmModal
      :open="Boolean(deleteTarget)"
      title="删除订阅源"
      :message="`确认删除「${deleteTarget?.name ?? ''}」？`"
      confirm-text="删除"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
