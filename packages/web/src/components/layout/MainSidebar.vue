<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { APP_NAV_ITEMS } from './nav';

defineProps<{
  darkMode: boolean;
}>();

const emit = defineEmits<{
  toggleTheme: [];
  logout: [];
}>();
</script>

<template>
  <aside class="main-sidebar">
    <div class="sidebar-main">
      <div class="sidebar-brand">
        <img src="/logo.png" alt="QianKui" class="sidebar-logo" />
        <div>
          <p class="eyebrow">Control Center</p>
          <strong>QianKui</strong>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in APP_NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          active-class="sidebar-link-active"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.caption }}</small>
        </RouterLink>
      </nav>
    </div>

    <div class="sidebar-footer">
      <button class="ghost sidebar-footer-button" @click="emit('toggleTheme')">
        {{ darkMode ? '浅色模式' : '深色模式' }}
      </button>
      <button class="ghost sidebar-footer-button" @click="emit('logout')">退出登录</button>
    </div>
  </aside>
</template>
