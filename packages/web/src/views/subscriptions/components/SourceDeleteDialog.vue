<script setup lang="ts">
import type { Source } from '../../../api';
import UiDialog from '../../../components/ui/UiDialog.vue';

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
  <UiDialog
    :open="open"
    tone="danger"
    title="确认删除"
    :description="`确定删除「${source?.name ?? ''}」吗？删除后需要重新添加订阅源才能恢复。`"
    confirm-text="删除"
    :confirm-loading="saving"
    :confirm-disabled="saving"
    @close="emit('close')"
    @confirm="emit('confirm')"
  />
</template>
