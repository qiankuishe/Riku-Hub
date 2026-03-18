<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import UiButton from '../../components/ui/UiButton.vue';
import UiEmptyState from '../../components/ui/UiEmptyState.vue';
import UiSectionCard from '../../components/ui/UiSectionCard.vue';
import { useLogsStore } from '../../stores/logs';
import { useUiStore } from '../../stores/ui';
import { formatDateTime } from '../../utils/date';

const logsStore = useLogsStore();
const uiStore = useUiStore();

onMounted(() => {
  uiStore.clearSecondaryNav();
  if (logsStore.logs.length === 0) {
    void logsStore.loadRecent(50);
  }
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
});
</script>

<template>
  <div class="page-shell page-shell-compact">
    <UiSectionCard class="compact-panel">
      <div class="section-head">
        <div>
          <h2>运行日志</h2>
          <p class="section-subtitle">保留最近系统事件，便于快速排障。</p>
        </div>
        <UiButton variant="tertiary" :disabled="logsStore.loading" @click="logsStore.loadRecent(50)">
          {{ logsStore.loading ? '刷新中...' : '刷新' }}
        </UiButton>
      </div>

      <UiEmptyState v-if="logsStore.logs.length === 0" title="暂无日志" description="触发操作后会在这里显示。" />

      <div v-else class="log-list">
        <article v-for="log in logsStore.logs" :key="log.id" class="log-item">
          <div class="log-head">
            <strong>{{ log.action }}</strong>
            <span>{{ formatDateTime(log.createdAt) }}</span>
          </div>
          <p>{{ log.detail || '无详情' }}</p>
        </article>
      </div>
    </UiSectionCard>
  </div>
</template>
