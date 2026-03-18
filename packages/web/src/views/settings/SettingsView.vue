<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { authApi, settingsApi, type SettingsBackupPayload, type SettingsExportStats } from '../../api';
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
    title: '清空片段库',
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
    uiStore.showToast(error instanceof Error ? error.message : '读取数据统计失败');
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
    uiStore.showToast('备份已导出');
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
      throw new Error('备份文件内容无效');
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
    uiStore.showToast(`${action.title}已完成`);
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
  uiStore.showToast('已退出登录');
  window.location.replace('/login');
}
</script>

<template>
  <div class="page-shell page-shell-compact">
    <section class="panel compact-panel settings-panel">
      <!-- Header -->
      <div class="section-head" style="margin-bottom: 20px;">
        <div>
          <h2>系统设置</h2>
          <p>{{ currentOrigin }}</p>
        </div>
        <div class="section-head-actions">
          <button class="ghost small" @click="uiStore.toggleDarkMode">
            {{ uiStore.darkMode ? '☀️ 浅色' : '🌙 深色' }}
          </button>
        </div>
      </div>

      <div class="settings-stack">
        <!-- Data -->
        <article :id="dataSectionId" class="settings-section-card">
          <div class="settings-section-head">
            <div>
              <h3>数据管理</h3>
            </div>
          </div>

          <!-- Stats -->
          <div class="settings-stat-grid">
            <div class="settings-stat-tile">
              <strong>{{ stats?.sources ?? (loadingStats ? '…' : 0) }}</strong>
              <span>订阅源</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.navigationCategories ?? (loadingStats ? '…' : 0) }}</strong>
              <span>导航分类</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.navigationLinks ?? (loadingStats ? '…' : 0) }}</strong>
              <span>导航链接</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.notes ?? (loadingStats ? '…' : 0) }}</strong>
              <span>笔记</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.snippets ?? (loadingStats ? '…' : 0) }}</strong>
              <span>片段</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="settings-action-grid">
            <button class="primary" :disabled="exporting" @click="exportBackup">
              {{ exporting ? '导出中...' : '导出备份' }}
            </button>

            <label class="ghost settings-upload-button" :class="{ disabled: importing }">
              <input type="file" accept=".json,application/json" :disabled="importing" @change="handleImport" />
              {{ importing ? '导入中...' : '导入备份' }}
            </label>

            <button class="ghost" :disabled="loadingStats" @click="refreshStats">
              {{ loadingStats ? '刷新中...' : '刷新统计' }}
            </button>
          </div>
        </article>

        <!-- Danger zone -->
        <article :id="dangerSectionId" class="settings-section-card settings-danger-section">
          <div class="settings-section-head">
            <div>
              <h3>危险区域</h3>
              <p>以下操作不可撤销，建议先导出备份。</p>
            </div>
          </div>

          <div class="settings-danger-grid">
            <div v-for="action in dangerActions" :key="action.scope" class="settings-danger-row">
              <div class="settings-danger-copy">
                <strong>{{ action.title }}</strong>
                <p>{{ action.description }}</p>
              </div>

              <button
                class="ghost small danger"
                :disabled="runningDangerAction === action.scope"
                @click="openDangerConfirm(action)"
              >
                {{ runningDangerAction === action.scope ? '处理中...' : action.buttonLabel }}
              </button>
            </div>
          </div>
        </article>

        <!-- Account -->
        <article :id="accountSectionId" class="settings-section-card">
          <div class="settings-section-head">
            <div><h3>账户</h3></div>
          </div>

          <div class="settings-account-stack">
            <div class="setting-card settings-account-card">
              <span>当前域名</span>
              <strong>{{ currentOrigin }}</strong>
            </div>

            <div class="settings-account-actions">
              <button class="ghost danger" @click="logout">退出登录</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Danger confirm dialog -->
    <div v-if="confirmTarget" class="modal-backdrop" @click.self="closeDangerConfirm">
      <div class="modal-card compact-modal-card panel">
        <div class="section-head">
          <div>
            <h2>{{ confirmTarget.title }}</h2>
          </div>
        </div>

        <p class="confirm-text">{{ confirmTarget.description }}此操作不可撤销，确认继续？</p>

        <div class="dialog-actions">
          <button class="ghost" :disabled="Boolean(runningDangerAction)" @click="closeDangerConfirm">取消</button>
          <button class="primary danger-fill" :disabled="Boolean(runningDangerAction)" @click="runDangerAction">
            {{ runningDangerAction ? '处理中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
