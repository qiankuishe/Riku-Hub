<script setup lang="ts">
import UiButton from '../../../components/ui/UiButton.vue';
import UiDialog from '../../../components/ui/UiDialog.vue';

defineProps<{
  open: boolean;
  title: string;
  qrCodeUrl: string;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <UiDialog :open="open" :title="title" description="扫码后即可导入订阅。" confirm-text="关闭" @close="emit('close')" @confirm="emit('close')">
    <img :src="qrCodeUrl" alt="QRCode" class="qr-image" />
    <template #footer>
      <UiButton variant="tertiary" @click="emit('close')">关闭</UiButton>
    </template>
  </UiDialog>
</template>
