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

const appearanceSectionId = 'settings-appearance';
const systemSectionId = 'settings-system';
const dataSectionId = 'settings-data';
const dangerSectionId = 'settings-danger';
const accountSectionId = 'settings-account';

const dangerActions: DangerActionConfig[] = [
  {
    scope: 'sources',
    title: '删除所有订阅源',
    description: '清空订阅源列表，并让聚合缓存重新进入待刷新状态。',
    buttonLabel: '清空订阅源'
  },
  {
    scope: 'navigation',
    title: '删除所有导航内容',
    description: '删除全部导航分类和链接，保留系统和登录状态。',
    buttonLabel: '清空导航'
  },
  {
    scope: 'notes',
    title: '删除所有笔记',
    description: '删除当前站点内的全部笔记内容。',
    buttonLabel: '清空笔记'
  },
  {
    scope: 'snippets',
    title: '删除所有片段',
    description: '删除片段库中的文本、代码、链接和图片数据。',
    buttonLabel: '清空片段库'
  },
  {
    scope: 'all',
    title: '删除所有业务数据',
    description: '一次性清空订阅源、导航、笔记和片段库，请先导出备份。',
    buttonLabel: '全部清空'
  }
];

onMounted(() => {
  uiStore.setSecondaryNav({
    title: '系统设置',
    activeKey: 'appearance',
    items: [
      { key: 'appearance', label: '外观', targetId: appearanceSectionId },
      { key: 'system', label: '系统', targetId: systemSectionId },
      { key: 'data', label: '数据管理', targetId: dataSectionId },
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
      <div class="section-head">
        <div>
          <h2>系统设置</h2>
          <p>把主题、备份恢复和高风险操作都收口到同一页，方便集中维护。</p>
        </div>
      </div>

      <div class="settings-stack">
        <article :id="appearanceSectionId" class="settings-section-card">
          <div class="settings-section-head">
            <div>
              <h3>外观</h3>
              <p>当前主题会保存在本地浏览器中。</p>
            </div>
          </div>

          <div class="settings-inline-grid">
            <div class="setting-card">
              <span>当前模式</span>
              <strong>{{ uiStore.darkMode ? '深色模式' : '浅色模式' }}</strong>
              <p>点击后立即切换，不需要刷新页面。</p>
            </div>

            <div class="setting-card">
              <span>主题动作</span>
              <strong>手动切换</strong>
              <button class="ghost small" @click="uiStore.toggleDarkMode">切换主题</button>
            </div>
          </div>
        </article>

        <article :id="systemSectionId" class="settings-section-card">
          <div class="settings-section-head">
            <div>
              <h3>系统信息</h3>
              <p>展示当前部署环境和后台结构，方便你判断备份和分享链接。</p>
            </div>
          </div>

          <div class="settings-inline-grid">
            <div class="setting-card">
              <span>当前域名</span>
              <strong>{{ currentOrigin }}</strong>
              <p>订阅链接和后台访问地址都会基于当前 HTTPS 域名生成。</p>
            </div>

            <div class="setting-card">
              <span>后台结构</span>
              <strong>一级板块独立页面</strong>
              <p>导航、订阅、笔记、片段、日志和设置都按独立入口加载。</p>
            </div>

            <div class="setting-card">
              <span>冷启动入口</span>
              <strong>侧边栏品牌区</strong>
              <p>点击 Riku-Hub 标识会清本地缓存并保留登录状态，按首次进入方式重载当前页。</p>
            </div>
          </div>
        </article>

        <article :id="dataSectionId" class="settings-section-card">
          <div class="settings-section-head">
            <div>
              <h3>数据管理</h3>
              <p>导出完整备份、导入历史数据，并快速查看当前业务数据量。</p>
            </div>
          </div>

          <div class="settings-stat-grid">
            <div class="settings-stat-tile">
              <strong>{{ stats?.sources ?? (loadingStats ? '...' : 0) }}</strong>
              <span>订阅源</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.navigationCategories ?? (loadingStats ? '...' : 0) }}</strong>
              <span>导航分类</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.navigationLinks ?? (loadingStats ? '...' : 0) }}</strong>
              <span>导航链接</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.notes ?? (loadingStats ? '...' : 0) }}</strong>
              <span>笔记</span>
            </div>
            <div class="settings-stat-tile">
              <strong>{{ stats?.snippets ?? (loadingStats ? '...' : 0) }}</strong>
              <span>片段</span>
            </div>
          </div>

          <div class="settings-action-grid">
            <button class="primary" :disabled="exporting" @click="exportBackup">
              {{ exporting ? '导出中...' : '导出数据' }}
            </button>

            <label class="ghost settings-upload-button" :class="{ disabled: importing }">
              <input type="file" accept=".json,application/json" :disabled="importing" @change="handleImport" />
              {{ importing ? '导入中...' : '导入数据' }}
            </label>

            <button class="ghost" :disabled="loadingStats" @click="refreshStats">
              {{ loadingStats ? '刷新中...' : '刷新统计' }}
            </button>
          </div>

          <p class="settings-helper-text">导入会用备份文件里的内容替换当前订阅源、导航、笔记和片段数据，建议先导出一份再继续。</p>
        </article>

        <article :id="dangerSectionId" class="settings-section-card settings-danger-section">
          <div class="settings-section-head">
            <div>
              <h3>危险区域</h3>
              <p>下面的操作不可撤销，适合做彻底清理或导入前的预处理。</p>
            </div>
          </div>

          <div class="settings-danger-grid">
            <div v-for="action in dangerActions" :key="action.scope" class="settings-danger-row">
              <div class="settings-danger-copy">
                <strong>{{ action.title }}</strong>
                <p>{{ action.description }}</p>
              </div>

              <button class="ghost small danger" :disabled="runningDangerAction === action.scope" @click="openDangerConfirm(action)">
                {{ runningDangerAction === action.scope ? '处理中...' : action.buttonLabel }}
              </button>
            </div>
          </div>
        </article>

        <article :id="accountSectionId" class="settings-section-card">
          <div class="settings-section-head">
            <div>
              <h3>账户</h3>
              <p>当前版本先保留最基础的会话管理入口。</p>
            </div>
          </div>

          <div class="settings-account-row">
            <div class="setting-card">
              <span>会话操作</span>
              <strong>退出当前登录</strong>
              <p>退出后会跳回登录页，本地冷启动按钮不会影响登录 Cookie。</p>
            </div>

            <button class="ghost danger" @click="logout">退出登录</button>
          </div>
        </article>
      </div>
    </section>

    <div v-if="confirmTarget" class="modal-backdrop" @click.self="closeDangerConfirm">
      <div class="modal-card compact-modal-card panel">
        <div class="section-head">
          <div>
            <h2>{{ confirmTarget.title }}</h2>
            <p>这项操作会直接改动线上数据，请确认你已经完成备份。</p>
          </div>
        </div>

        <p class="confirm-text">{{ confirmTarget.description }}</p>

        <div class="dialog-actions">
          <button class="ghost" :disabled="Boolean(runningDangerAction)" @click="closeDangerConfirm">取消</button>
          <button class="primary danger-fill" :disabled="Boolean(runningDangerAction)" @click="runDangerAction">
            {{ runningDangerAction ? '处理中...' : '确认继续' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
