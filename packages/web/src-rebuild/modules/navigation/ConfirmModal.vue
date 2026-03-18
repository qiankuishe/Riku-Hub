<script setup lang="ts">
import UiDialog from '../../../src/components/ui/UiDialog.vue';

withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }>(),
  {
    confirmText: '确认',
    cancelText: '取消',
    danger: true
  }
);

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <UiDialog
    :open="open"
    :title="title"
    :description="message"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :tone="danger ? 'danger' : 'default'"
    @close="emit('close')"
    @confirm="emit('confirm')"
  />
</template>
