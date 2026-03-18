<script setup lang="ts">
import UiButton from '../ui/UiButton.vue';

defineProps<{
  title: string;
  subtitle: string;
}>();

const emit = defineEmits<{
  menu: [];
}>();
</script>

<template>
  <header class="topbar">
    <div class="topbar-title">
      <UiButton class="menu-button" variant="tertiary" size="sm" @click="emit('menu')">菜单</UiButton>
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </header>
</template>
