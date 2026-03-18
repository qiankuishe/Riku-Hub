<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
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
    <section class="panel compact-panel">
      <div class="section-head">
        <div>
          <h2>运行日志</h2>
        </div>
        <button class="ghost" :disabled="logsStore.loading" @click="logsStore.loadRecent(50)">
          {{ logsStore.loading ? '刷新中...' : '刷新日志' }}
        </button>
      </div>

      <div v-if="logsStore.logs.length === 0" class="empty-state">暂无日志。</div>
      <div v-else class="log-list">
        <article v-for="log in logsStore.logs" :key="log.id" class="log-item">
          <div class="log-head">
            <strong>{{ log.action }}</strong>
            <span>{{ formatDateTime(log.createdAt) }}</span>
          </div>
          <p>{{ log.detail || '无详情' }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
