<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { LogRecord } from '../../core/api';
import { logsApi } from '../../core/api';
import UiButton from '../../../src/components/ui/UiButton.vue';
import { formatDateTime } from '../../core/format';
import { useUiStore } from '../../../src/stores/ui';

const uiStore = useUiStore();
const logs = ref<LogRecord[]>([]);
const loading = ref(false);
const errorMessage = ref('');

onMounted(() => {
  uiStore.clearSecondaryNav();
  void loadLogs();
});

onUnmounted(() => {
  uiStore.clearSecondaryNav();
});

async function loadLogs() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await logsApi.getRecent(50);
    logs.value = data.logs;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="v3-page">
    <section class="v3-card">
      <div class="v3-card-head">
        <div>
          <h2 class="v3-card-title">运行日志</h2>
          <p class="v3-muted">最近系统事件与操作记录。</p>
        </div>
        <UiButton variant="tertiary" :disabled="loading" @click="loadLogs">
          {{ loading ? '刷新中...' : '刷新' }}
        </UiButton>
      </div>

      <div v-if="errorMessage" class="v3-danger">{{ errorMessage }}</div>
      <div v-else-if="!logs.length" class="v3-muted">暂无日志</div>
      <div v-else class="v3-log-list">
        <article v-for="log in logs" :key="log.id" class="v3-log-item">
          <div class="v3-log-item-head">
            <strong>{{ log.action }}</strong>
            <span class="v3-muted">{{ formatDateTime(log.createdAt) }}</span>
          </div>
          <p class="v3-muted">{{ log.detail || '无详情' }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
