<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  darkMode: boolean;
}>();

const emit = defineEmits<{
  menu: [];
  toggleTheme: [];
  logout: [];
}>();
</script>

<template>
  <header class="topbar">
    <div class="topbar-title">
      <button class="ghost small menu-button" @click="emit('menu')">菜单</button>
      <div>
        <h1>{{ title }}</h1>
        <p class="subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div class="topbar-actions">
      <button class="ghost" @click="emit('toggleTheme')">
        {{ darkMode ? '浅色模式' : '深色模式' }}
      </button>
      <button class="ghost" @click="emit('logout')">退出登录</button>
    </div>
  </header>
</template>
