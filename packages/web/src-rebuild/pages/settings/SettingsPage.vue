<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { authApi, settingsApi, type SettingsBackupPayload, type SettingsExportStats } from '../../core/api';
import UiButton from '../../../src/components/ui/UiButton.vue';
import UiDialog from '../../../src/components/ui/UiDialog.vue';
import { useUiStore } from '../../../src/stores/ui';

type DangerScope = 'sources' | 'navigation' | 'notes' | 'snippets' | 'all';

interface DangerAction {
  scope: DangerScope;
  title: string;
  description: string;
}

const uiStore = useUiStore();

const currentOrigin = computed(() => window.location.origin);
const stats = ref<SettingsExportStats | null>(null);
const loadingStats = ref(false);
const exporting = ref(false);
const importing = ref(false);
const clearing = ref<DangerScope | null>(null);
const dangerTarget = ref<DangerAction | null>(null);

const dataSectionId = 'v3-settings-data';
const dangerSectionId = 'v3-settings-danger';
const accountSectionId = 'v3-settings-account';

const dangerActions: DangerAction[] = [
  { scope: 'sources', title: '清空订阅源', description: '删除全部订阅源数据。' },
  { scope: 'navigation', title: '清空导航', description: '删除全部分类与链接。' },
  { scope: 'notes', title: '清空笔记', description: '删除全部笔记内容。' },
  { scope: 'snippets', title: '清空片段', description: '删除全部片段数据。' },
  { scope: 'all', title: '全部清空', description: '删除所有业务数据。' }
];

onMounted(() => {
  uiStore.setSecondaryNav({
    title: '系统设置',
    activeKey: 'data',
    items: [
      { key: 'data', label: '数据管理', targetId: dataSectionId },
      { key: 'danger', label: '危险区域', targetId: dangerSectionId },
      { key: 'account', label: '账户', targetId: accountSectionId }
    ]
  });
  void loadStats();
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
});

async function loadStats() {
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

async function exportData() {
  exporting.value = true;
  try {
    const data = await settingsApi.exportData();
    const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riku-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1200);
    uiStore.showToast('导出完成');
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '导出失败');
  } finally {
    exporting.value = false;
  }
}

async function importData(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  importing.value = true;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as SettingsBackupPayload;
    const data = await settingsApi.importData(parsed);
    uiStore.showToast(data.message || '导入完成');
    await loadStats();
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '导入失败');
  } finally {
    importing.value = false;
    input.value = '';
  }
}

function openDangerDialog(action: DangerAction) {
  dangerTarget.value = action;
}

async function runDangerAction() {
  if (!dangerTarget.value) {
    return;
  }
  const scope = dangerTarget.value.scope;
  clearing.value = scope;
  try {
    await settingsApi.clearData(scope);
    uiStore.showToast(`${dangerTarget.value.title}完成`);
    dangerTarget.value = null;
    await loadStats();
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '操作失败');
  } finally {
    clearing.value = null;
  }
}

async function logout() {
  await authApi.logout().catch(() => undefined);
  window.location.replace('/login');
}
</script>

<template>
  <div class="v3-page">
    <section class="v3-card" :id="dataSectionId">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">数据管理</h2>
          <p class="v3-muted">导出、导入和数据概览。</p>
        </div>
      </div>

      <div class="v3-list" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
        <div class="v3-item">
          <strong>订阅源</strong>
          <p class="v3-muted">{{ stats?.sources ?? (loadingStats ? '...' : 0) }}</p>
        </div>
        <div class="v3-item">
          <strong>导航分类</strong>
          <p class="v3-muted">{{ stats?.navigationCategories ?? (loadingStats ? '...' : 0) }}</p>
        </div>
        <div class="v3-item">
          <strong>导航链接</strong>
          <p class="v3-muted">{{ stats?.navigationLinks ?? (loadingStats ? '...' : 0) }}</p>
        </div>
        <div class="v3-item">
          <strong>笔记</strong>
          <p class="v3-muted">{{ stats?.notes ?? (loadingStats ? '...' : 0) }}</p>
        </div>
        <div class="v3-item">
          <strong>片段</strong>
          <p class="v3-muted">{{ stats?.snippets ?? (loadingStats ? '...' : 0) }}</p>
        </div>
      </div>

      <div class="v3-inline-actions" style="margin-top: 12px;">
        <UiButton variant="primary" :loading="exporting" :disabled="exporting" @click="exportData">导出</UiButton>
        <label class="ui-button ui-button--secondary ui-button--md" :style="{ opacity: importing ? 0.6 : 1 }">
          <input type="file" accept=".json,application/json" style="display: none;" :disabled="importing" @change="importData" />
          {{ importing ? '导入中...' : '导入' }}
        </label>
        <UiButton variant="tertiary" :disabled="loadingStats" @click="loadStats">
          {{ loadingStats ? '刷新中...' : '刷新' }}
        </UiButton>
      </div>
    </section>

    <section class="v3-card" :id="dangerSectionId">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">危险区域</h2>
          <p class="v3-muted">高风险操作，需要二次确认。</p>
        </div>
      </div>

      <div class="v3-list">
        <article v-for="action in dangerActions" :key="action.scope" class="v3-item">
          <div class="v3-card-head" style="margin-bottom: 4px;">
            <strong>{{ action.title }}</strong>
            <UiButton size="sm" variant="danger" :disabled="clearing === action.scope" @click="openDangerDialog(action)">
              {{ clearing === action.scope ? '处理中...' : '执行' }}
            </UiButton>
          </div>
          <p class="v3-muted">{{ action.description }}</p>
        </article>
      </div>
    </section>

    <section class="v3-card" :id="accountSectionId">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">账户</h2>
          <p class="v3-muted">当前实例和登录状态。</p>
        </div>
      </div>

      <div class="v3-item">
        <strong>当前域名</strong>
        <p class="v3-muted">{{ currentOrigin }}</p>
      </div>
      <div class="v3-inline-actions" style="margin-top: 12px;">
        <UiButton variant="danger" @click="logout">退出登录</UiButton>
      </div>
    </section>

    <UiDialog
      :open="Boolean(dangerTarget)"
      tone="danger"
      :title="dangerTarget?.title ?? '确认操作'"
      :description="`${dangerTarget?.description ?? ''}此操作不可撤销，确认继续？`"
      :confirm-loading="Boolean(clearing)"
      :confirm-disabled="Boolean(clearing)"
      confirm-text="确认"
      cancel-text="取消"
      @close="dangerTarget = null"
      @confirm="runDangerAction"
    />
  </div>
</template>
