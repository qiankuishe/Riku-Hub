<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { authApi, settingsApi, type SettingsBackupPayload, type SettingsExportStats } from '../../api';
import UiButton from '../../components/ui/UiButton.vue';
import UiDialog from '../../components/ui/UiDialog.vue';
import UiSectionCard from '../../components/ui/UiSectionCard.vue';
import UiStatTile from '../../components/ui/UiStatTile.vue';
import { useUiStore } from '../../stores/ui';

type DangerScope = 'sources' | 'navigation' | 'notes' | 'snippets' | 'all';

interface DangerActionConfig {
  scope: DangerScope;
  title: string;
  description: string;
  buttonLabel: string;
}

const uiStore = useUiStore();

const currentOrigin = computed(() => window.location.origin);
const stats = ref<SettingsExportStats | null>(null);
const loadingStats = ref(false);
const exporting = ref(false);
const importing = ref(false);
const runningDangerAction = ref<DangerScope | null>(null);
const confirmTarget = ref<DangerActionConfig | null>(null);

const dataSectionId = 'settings-data';
const dangerSectionId = 'settings-danger';
const accountSectionId = 'settings-account';

const dangerActions: DangerActionConfig[] = [
  {
    scope: 'sources',
    title: '清空订阅源',
    description: '清空订阅源列表，聚合缓存进入待刷新状态。',
    buttonLabel: '清空'
  },
  {
    scope: 'navigation',
    title: '清空导航',
    description: '删除全部导航分类和链接。',
    buttonLabel: '清空'
  },
  {
    scope: 'notes',
    title: '清空笔记',
    description: '删除全部笔记内容。',
    buttonLabel: '清空'
  },
  {
    scope: 'snippets',
    title: '清空片段',
    description: '删除文本、代码、链接和图片数据。',
    buttonLabel: '清空'
  },
  {
    scope: 'all',
    title: '全部清空',
    description: '一次性清空所有业务数据，请先导出备份。',
    buttonLabel: '全部清空'
  }
];

onMounted(() => {
  uiStore.setSecondaryNav({
    title: '系统设置',
    activeKey: 'data',
    items: [
      { key: 'data', label: '数据', targetId: dataSectionId },
      { key: 'danger', label: '危险区域', targetId: dangerSectionId },
      { key: 'account', label: '账户', targetId: accountSectionId }
    ]
  });

  void refreshStats();
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
});

async function refreshStats() {
  loadingStats.value = true;
  try {
    const data = await settingsApi.getExportStats();
    stats.value = data.stats;
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '读取统计失败');
  } finally {
    loadingStats.value = false;
  }
}

async function exportBackup() {
  exporting.value = true;
  try {
    const data = await settingsApi.exportData();
    const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riku-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    uiStore.showToast('导出完成');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '导出失败');
  } finally {
    exporting.value = false;
  }
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  importing.value = true;
  try {
    const text = await file.text();
    const backup = JSON.parse(text) as unknown;
    if (!backup || typeof backup !== 'object') {
      throw new Error('备份文件无效');
    }

    const data = await settingsApi.importData(backup as SettingsBackupPayload);
    uiStore.showToast(data.message);
    await refreshStats();
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '导入失败');
  } finally {
    importing.value = false;
    input.value = '';
  }
}

function openDangerConfirm(action: DangerActionConfig) {
  confirmTarget.value = action;
}

function closeDangerConfirm() {
  confirmTarget.value = null;
}

async function runDangerAction() {
  if (!confirmTarget.value) {
    return;
  }

  const action = confirmTarget.value;
  runningDangerAction.value = action.scope;
  try {
    await settingsApi.clearData(action.scope);
    uiStore.showToast(`${action.title}完成`);
    closeDangerConfirm();
    await refreshStats();
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '操作失败');
  } finally {
    runningDangerAction.value = null;
  }
}

async function logout() {
  await authApi.logout().catch(() => undefined);
  uiStore.showToast('已退出');
  window.location.replace('/login');
}
</script>

<template>
  <div class="page-shell page-shell-compact">
    <UiSectionCard class="compact-panel settings-panel">
      <div class="section-head">
        <div>
          <h2>系统设置</h2>
          <p class="section-subtitle">{{ currentOrigin }}</p>
        </div>
      </div>

      <div class="settings-stack">
        <UiSectionCard :id="dataSectionId" title="数据管理" subtitle="备份、恢复与统计">
          <div class="settings-stat-grid">
            <UiStatTile label="订阅源" :value="stats?.sources ?? (loadingStats ? '...' : 0)" />
            <UiStatTile label="导航分类" :value="stats?.navigationCategories ?? (loadingStats ? '...' : 0)" />
            <UiStatTile label="导航链接" :value="stats?.navigationLinks ?? (loadingStats ? '...' : 0)" />
            <UiStatTile label="笔记" :value="stats?.notes ?? (loadingStats ? '...' : 0)" />
            <UiStatTile label="片段" :value="stats?.snippets ?? (loadingStats ? '...' : 0)" />
          </div>

          <div class="settings-action-grid">
            <UiButton variant="primary" :loading="exporting" :disabled="exporting" @click="exportBackup">导出</UiButton>
            <label class="ghost settings-upload-button" :class="{ disabled: importing }">
              <input type="file" accept=".json,application/json" :disabled="importing" @change="handleImport" />
              {{ importing ? '导入中...' : '导入' }}
            </label>
            <UiButton variant="tertiary" :disabled="loadingStats" @click="refreshStats">
              {{ loadingStats ? '刷新中...' : '刷新' }}
            </UiButton>
          </div>
        </UiSectionCard>

        <UiSectionCard :id="dangerSectionId" title="危险区域" subtitle="高风险操作需要二次确认">
          <div class="settings-danger-grid">
            <div v-for="action in dangerActions" :key="action.scope" class="settings-danger-row">
              <div class="settings-danger-copy">
                <strong>{{ action.title }}</strong>
                <p>{{ action.description }}</p>
              </div>
              <UiButton variant="danger" size="sm" :disabled="runningDangerAction === action.scope" @click="openDangerConfirm(action)">
                {{ runningDangerAction === action.scope ? '处理中...' : action.buttonLabel }}
              </UiButton>
            </div>
          </div>
        </UiSectionCard>

        <UiSectionCard :id="accountSectionId" title="账户" subtitle="当前实例和登录状态">
          <div class="settings-account-stack">
            <div class="setting-card settings-account-card">
              <span>当前域名</span>
              <strong>{{ currentOrigin }}</strong>
            </div>
            <div class="settings-account-actions">
              <UiButton variant="danger" @click="logout">退出</UiButton>
            </div>
          </div>
        </UiSectionCard>
      </div>
    </UiSectionCard>

    <UiDialog
      :open="Boolean(confirmTarget)"
      tone="danger"
      :title="confirmTarget?.title ?? '确认操作'"
      :description="`${confirmTarget?.description ?? ''}此操作不可撤销，确认继续？`"
      confirm-text="确认"
      :confirm-loading="Boolean(runningDangerAction)"
      :confirm-disabled="Boolean(runningDangerAction)"
      @close="closeDangerConfirm"
      @confirm="runDangerAction"
    />
  </div>
</template>
