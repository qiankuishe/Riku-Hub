<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { sourcesApi, type Source, type ValidationResult } from '../../api';
import { useSubscriptionsStore } from '../../stores/subscriptions';
import { useUiStore } from '../../stores/ui';
import QrCodeDialog from './components/QrCodeDialog.vue';
import SourceDeleteDialog from './components/SourceDeleteDialog.vue';
import SourceEditorDialog from './components/SourceEditorDialog.vue';
import SourcesPanel from './components/SourcesPanel.vue';
import SubscriptionLinksPanel from './components/SubscriptionLinksPanel.vue';

const subscriptionsStore = useSubscriptionsStore();
const uiStore = useUiStore();

const dialogVisible = ref(false);
const editingSource = ref<Source | null>(null);
const formName = ref('');
const formContent = ref('');
const validation = ref<ValidationResult | null>(null);
const validating = ref(false);
const errorMessage = ref('');
const qrDialogVisible = ref(false);
const qrTitle = ref('');
const qrCodeUrl = ref('');
const deleteTarget = ref<Source | null>(null);
let validateTimer: number | undefined;
let validationRequestId = 0;

const dialogTitle = computed(() => (editingSource.value ? '编辑订阅源' : '新增订阅源'));
const cacheStatusText = computed(() => {
  if (!subscriptionsStore.subInfo) {
    return '未加载';
  }
  const statusMap: Record<string, string> = {
    fresh: '缓存有效',
    stale: '缓存较旧',
    missing: '未生成缓存'
  };
  return statusMap[subscriptionsStore.subInfo.cacheStatus] || subscriptionsStore.subInfo.cacheStatus;
});

onMounted(() => {
  uiStore.clearSecondaryNav();
  void subscriptionsStore.loadPageData();
});

onUnmounted(() => {
  cancelPendingValidation();
  uiStore.clearSecondaryNav();
});

watch(formContent, () => {
  if (validateTimer) {
    window.clearTimeout(validateTimer);
  }
  validateTimer = window.setTimeout(() => {
    void validateCurrentInput();
  }, 300);
});

async function validateCurrentInput() {
  const currentContent = formContent.value.trim();
  if (!currentContent) {
    cancelPendingValidation();
    validation.value = null;
    errorMessage.value = '';
    validating.value = false;
    return;
  }

  const currentRequestId = ++validationRequestId;
  validating.value = true;
  errorMessage.value = '';
  try {
    const result = await sourcesApi.validate(currentContent);
    if (currentRequestId !== validationRequestId || currentContent !== formContent.value.trim() || !dialogVisible.value) {
      return;
    }
    validation.value = result;
    errorMessage.value = '';
  } catch (error) {
    if (currentRequestId !== validationRequestId || !dialogVisible.value) {
      return;
    }
    validation.value = null;
    errorMessage.value = error instanceof Error ? error.message : '校验失败';
  } finally {
    if (currentRequestId === validationRequestId) {
      validating.value = false;
    }
  }
}

function openCreateDialog() {
  cancelPendingValidation();
  editingSource.value = null;
  formName.value = '';
  formContent.value = '';
  validation.value = null;
  errorMessage.value = '';
  validating.value = false;
  dialogVisible.value = true;
}

function openEditDialog(source: Source) {
  cancelPendingValidation();
  editingSource.value = source;
  formName.value = source.name;
  formContent.value = source.content;
  validation.value = null;
  errorMessage.value = '';
  validating.value = false;
  dialogVisible.value = true;
}

function cancelPendingValidation() {
  if (validateTimer) {
    window.clearTimeout(validateTimer);
    validateTimer = undefined;
  }
  validationRequestId += 1;
}

function closeEditorDialog() {
  cancelPendingValidation();
  dialogVisible.value = false;
  validation.value = null;
  errorMessage.value = '';
  validating.value = false;
}

async function saveSource() {
  if (!formName.value.trim() || !formContent.value.trim()) {
    errorMessage.value = '名称和内容都不能为空';
    return;
  }

  errorMessage.value = '';
  try {
    if (editingSource.value) {
      await subscriptionsStore.updateSource(editingSource.value.id, {
        name: formName.value.trim(),
        content: formContent.value.trim()
      });
      uiStore.showToast('订阅源已更新');
    } else {
      await subscriptionsStore.createSource(formName.value.trim(), formContent.value.trim());
      uiStore.showToast('订阅源已创建');
    }
    closeEditorDialog();
    await subscriptionsStore.loadPageData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败';
  }
}

async function moveSource(source: Source, direction: -1 | 1) {
  const list = [...subscriptionsStore.sources];
  const index = list.findIndex((item) => item.id === source.id);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= list.length) {
    return;
  }
  const [item] = list.splice(index, 1);
  list.splice(targetIndex, 0, item);
  try {
    await subscriptionsStore.reorderSources(list.map((entry) => entry.id));
    uiStore.showToast(direction < 0 ? '订阅源已上移' : '订阅源已下移');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '排序失败';
    uiStore.showToast('排序失败');
  }
}

function removeSource(source: Source) {
  deleteTarget.value = source;
}

async function confirmDelete() {
  if (!deleteTarget.value) {
    return;
  }
  try {
    await subscriptionsStore.deleteSource(deleteTarget.value.id);
    await subscriptionsStore.loadPageData();
    deleteTarget.value = null;
    uiStore.showToast('订阅源已删除');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除失败';
    uiStore.showToast('删除失败');
  }
}

async function copyLink(url: string) {
  await navigator.clipboard.writeText(url);
  uiStore.showToast('复制成功');
}

async function showQr(name: string, url: string) {
  const { toDataURL } = await import('qrcode');
  qrTitle.value = name;
  qrCodeUrl.value = await toDataURL(url, { width: 260, margin: 1 });
  qrDialogVisible.value = true;
}

async function refreshAggregation() {
  await subscriptionsStore.refreshAggregation();
  uiStore.showToast('聚合缓存已刷新');
}
</script>

<template>
  <div class="page-shell page-shell-compact">
    <div class="subscriptions-layout">
      <SubscriptionLinksPanel
        :sub-info="subscriptionsStore.subInfo"
        :sub-formats="subscriptionsStore.subFormats"
        :last-save-time="subscriptionsStore.lastSaveTime"
        :cache-status-text="cacheStatusText"
        :refreshing="subscriptionsStore.refreshing"
        @copy="copyLink"
        @qr="showQr"
        @refresh="refreshAggregation"
      />

      <SourcesPanel
        :sources="subscriptionsStore.sources"
        :saving="subscriptionsStore.saving"
        @create="openCreateDialog"
        @edit="openEditDialog"
        @delete="removeSource"
        @move="moveSource"
      />
    </div>

    <SourceEditorDialog
      :open="dialogVisible"
      :title="dialogTitle"
      :form-name="formName"
      :form-content="formContent"
      :validation="validation"
      :validating="validating"
      :error-message="errorMessage"
      :saving="subscriptionsStore.saving"
      @close="closeEditorDialog"
      @save="saveSource"
      @update:form-name="formName = $event"
      @update:form-content="formContent = $event"
    />

    <QrCodeDialog :open="qrDialogVisible" :title="qrTitle" :qr-code-url="qrCodeUrl" @close="qrDialogVisible = false" />

    <SourceDeleteDialog
      :open="Boolean(deleteTarget)"
      :source="deleteTarget"
      :saving="subscriptionsStore.saving"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
