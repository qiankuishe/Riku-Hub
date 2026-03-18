<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { SecondaryNavItem } from '../../stores/ui';
import { APP_NAV_ITEMS } from './nav';

defineProps<{
  open: boolean;
  currentPath: string;
  secondaryTitle: string;
  secondaryItems: SecondaryNavItem[];
  secondaryActiveKey: string;
}>();

const emit = defineEmits<{
  close: [];
  selectSecondary: [item: SecondaryNavItem];
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
            :class="{ 'sidebar-link-active': currentPath.startsWith(item.to) }"
            @click="emit('close')"
          >
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <section v-if="secondaryItems.length" class="mobile-secondary-nav">
          <div class="mobile-secondary-nav-head">{{ secondaryTitle }}</div>
          <div class="mobile-secondary-nav-list">
            <button
              v-for="item in secondaryItems"
              :key="item.key"
              class="secondary-link"
              :class="{ 'secondary-link-active': secondaryActiveKey === item.key }"
              @click="emit('selectSecondary', item)"
            >
              <span>{{ item.label }}</span>
              <small v-if="item.badge">{{ item.badge }}</small>
            </button>
          </div>
        </section>
      </aside>
    </div>
  </transition>
</template>
