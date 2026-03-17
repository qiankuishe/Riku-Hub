<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { APP_NAV_ITEMS } from './nav';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
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
      </aside>
    </div>
  </transition>
</template>
