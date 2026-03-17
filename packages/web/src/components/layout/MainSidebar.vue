<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { APP_NAV_ITEMS } from './nav';
</script>

<template>
  <aside class="main-sidebar">
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
  </aside>
</template>
