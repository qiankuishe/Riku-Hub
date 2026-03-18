<script setup lang="ts">
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
      <button class="ghost small menu-button" @click="emit('menu')">菜单</button>
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </header>
</template>
