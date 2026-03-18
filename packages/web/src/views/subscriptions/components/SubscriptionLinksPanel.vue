<script setup lang="ts">
import type { SubInfo, SubFormat } from '../../../api';
import UiButton from '../../../components/ui/UiButton.vue';
import UiSectionCard from '../../../components/ui/UiSectionCard.vue';
import UiStatTile from '../../../components/ui/UiStatTile.vue';
import { formatDateTime } from '../../../utils/date';

defineProps<{
  subInfo: SubInfo | null;
  subFormats: SubFormat[];
  lastSaveTime: string;
  cacheStatusText: string;
  refreshing: boolean;
}>();

const emit = defineEmits<{
  copy: [url: string];
  qr: [name: string, url: string];
  refresh: [];
}>();

function shortenUrl(url: string, maxLength = 56) {
  if (url.length <= maxLength) {
    return url;
  }
  return `${url.slice(0, maxLength)}...`;
}
</script>

<template>
  <UiSectionCard class="compact-panel" title="订阅链接" subtitle="聚合结果和格式输出">
    <div class="section-head-actions">
      <div class="status-pill" :data-status="subInfo?.cacheStatus || 'missing'">
        {{ cacheStatusText }}
      </div>
      <UiButton variant="tertiary" size="sm" :disabled="refreshing" @click="emit('refresh')">
        {{ refreshing ? '刷新中...' : '刷新缓存' }}
      </UiButton>
    </div>

    <div class="meta-grid">
      <UiStatTile label="总节点数" :value="subInfo?.totalNodes ?? 0" />
      <UiStatTile label="最近刷新" :value="formatDateTime(subInfo?.lastRefreshTime, '尚未刷新')" />
      <UiStatTile label="警告数" :value="subInfo?.warningCount ?? 0" />
      <UiStatTile label="最近保存" :value="formatDateTime(lastSaveTime, '尚未保存')" />
    </div>

    <p v-if="subInfo?.lastRefreshError" class="error-banner">
      {{ subInfo.lastRefreshError }}
    </p>

    <div class="link-list subscription-links-list">
      <article v-for="format in subFormats" :key="format.key" class="link-item">
        <div>
          <h3>{{ format.name }}</h3>
          <p :title="format.url">{{ shortenUrl(format.url) }}</p>
        </div>
        <div class="link-actions">
          <UiButton variant="tertiary" size="sm" @click="emit('copy', format.url)">复制</UiButton>
          <UiButton variant="tertiary" size="sm" @click="emit('qr', format.name, format.url)">二维码</UiButton>
        </div>
      </article>
    </div>
  </UiSectionCard>
</template>
