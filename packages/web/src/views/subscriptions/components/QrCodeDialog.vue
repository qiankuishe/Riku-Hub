<script setup lang="ts">
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
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card qr-card">
      <div class="section-head">
        <div>
          <h2>{{ title }}</h2>
          <p class="section-subtitle">扫码后即可导入订阅。</p>
        </div>
      </div>
      <img :src="qrCodeUrl" alt="QRCode" class="qr-image" />
      <div class="dialog-actions">
        <button class="ghost" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>
