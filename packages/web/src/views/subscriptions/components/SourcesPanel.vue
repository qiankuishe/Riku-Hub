<script setup lang="ts">
import type { Source } from '../../../api';
import UiButton from '../../../components/ui/UiButton.vue';
import UiEmptyState from '../../../components/ui/UiEmptyState.vue';
import UiSectionCard from '../../../components/ui/UiSectionCard.vue';
import { formatDateTime } from '../../../utils/date';

defineProps<{
  sources: Source[];
  saving: boolean;
}>();

const emit = defineEmits<{
  create: [];
  edit: [source: Source];
  delete: [source: Source];
  move: [source: Source, direction: -1 | 1];
}>();

function isFirstSource(source: Source, sources: Source[]) {
  return sources[0]?.id === source.id;
}

function isLastSource(source: Source, sources: Source[]) {
  return sources.at(-1)?.id === source.id;
}
</script>

<template>
  <UiSectionCard class="compact-panel" title="订阅源管理" subtitle="维护原始订阅源并调整顺序。">
    <template #default>
      <div class="section-head-actions">
        <UiButton variant="primary" @click="emit('create')">新增订阅源</UiButton>
      </div>

      <UiEmptyState
        v-if="sources.length === 0"
        title="还没有订阅源"
        description="先新增一个订阅源，系统会自动聚合。"
      />

      <div v-else class="source-list">
        <article v-for="source in sources" :key="source.id" class="source-card">
          <div class="source-main">
            <h3>{{ source.name }}</h3>
            <p>{{ source.nodeCount }} 条节点 · 更新于 {{ formatDateTime(source.updatedAt) }}</p>
          </div>
          <div class="source-actions">
            <UiButton variant="tertiary" size="sm" :disabled="saving || isFirstSource(source, sources)" @click="emit('move', source, -1)">上移</UiButton>
            <UiButton variant="tertiary" size="sm" :disabled="saving || isLastSource(source, sources)" @click="emit('move', source, 1)">下移</UiButton>
            <UiButton variant="tertiary" size="sm" :disabled="saving" @click="emit('edit', source)">编辑</UiButton>
            <UiButton variant="danger" size="sm" :disabled="saving" @click="emit('delete', source)">删除</UiButton>
          </div>
        </article>
      </div>
    </template>
  </UiSectionCard>
</template>
