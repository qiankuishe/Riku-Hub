<script setup lang="ts">
import type { Source } from '../../../api';

defineProps<{
  open: boolean;
  source: Source | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card confirm-card">
      <div class="section-head">
        <div>
          <h2>确认删除</h2>
          <p class="section-subtitle">删除后需要重新添加订阅源才能恢复。</p>
        </div>
      </div>
      <p class="confirm-text">确定删除「{{ source?.name }}」吗？</p>
      <div class="dialog-actions">
        <button class="ghost" :disabled="saving" @click="emit('close')">取消</button>
        <button class="primary danger-fill" :disabled="saving" @click="emit('confirm')">
          {{ saving ? '删除中...' : '删除' }}
        </button>
      </div>
    </div>
  </div>
</template>
