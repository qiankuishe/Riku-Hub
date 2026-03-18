<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { APP_NAV_ITEMS } from './nav';

defineProps<{
  currentPath: string;
}>();
</script>

<template>
  <aside class="main-sidebar">
    <div class="sidebar-brand sidebar-brand-compact">
      <img src="/logo.png" alt="QianKui" class="sidebar-logo" />
      <strong>Q</strong>
    </div>

    <nav class="sidebar-nav sidebar-nav-compact">
      <RouterLink
        v-for="item in APP_NAV_ITEMS"
        :key="item.to"
        :to="item.to"
        class="sidebar-link sidebar-link-compact"
        :class="{ 'sidebar-link-active': currentPath.startsWith(item.to) }"
        :title="item.label"
      >
        <span class="sidebar-link-badge">{{ item.shortLabel.slice(0, 1) }}</span>
        <small>{{ item.shortLabel }}</small>
      </RouterLink>
    </nav>
  </aside>
</template>
