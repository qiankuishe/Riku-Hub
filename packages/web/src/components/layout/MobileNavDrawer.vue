<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { APP_NAV_ITEMS } from './nav';

defineProps<{
  open: boolean;
  darkMode: boolean;
}>();

const emit = defineEmits<{
  close: [];
  toggleTheme: [];
  logout: [];
}>();
</script>

<template>
  <transition name="drawer-fade">
    <div v-if="open" class="mobile-drawer-backdrop" @click.self="emit('close')">
      <aside class="mobile-drawer">
        <div class="mobile-drawer-head">
          <div class="sidebar-brand">
            <img src="/logo.png" alt="QianKui" class="sidebar-logo" />
            <div>
              <p class="eyebrow">Control Center</p>
              <strong>QianKui</strong>
            </div>
          </div>
          <button class="ghost small" @click="emit('close')">收起</button>
        </div>

        <nav class="sidebar-nav">
          <RouterLink
            v-for="item in APP_NAV_ITEMS"
            :key="item.to"
            :to="item.to"
            class="sidebar-link"
            active-class="sidebar-link-active"
            @click="emit('close')"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.caption }}</small>
          </RouterLink>
        </nav>

        <div class="sidebar-footer sidebar-footer-mobile">
          <button class="ghost sidebar-footer-button" @click="emit('toggleTheme')">
            {{ darkMode ? '浅色模式' : '深色模式' }}
          </button>
          <button class="ghost sidebar-footer-button" @click="emit('logout')">退出登录</button>
        </div>
      </aside>
    </div>
  </transition>
</template>
