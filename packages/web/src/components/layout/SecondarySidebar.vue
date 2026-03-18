<script setup lang="ts">
import type { SecondaryNavItem } from '../../stores/ui';

defineProps<{
  title: string;
  items: SecondaryNavItem[];
  activeKey: string;
}>();

const emit = defineEmits<{
  select: [item: SecondaryNavItem];
}>();
</script>

<template>
  <aside v-if="items.length" class="secondary-sidebar desktop-only">
    <div class="secondary-sidebar-head">
      <h2>{{ title }}</h2>
    </div>

    <nav class="secondary-nav">
      <button
        v-for="item in items"
        :key="item.key"
        class="secondary-link"
        :class="{ 'secondary-link-active': activeKey === item.key }"
        @click="emit('select', item)"
      >
        <span>{{ item.label }}</span>
        <small v-if="item.badge">{{ item.badge }}</small>
      </button>
    </nav>
  </aside>
</template>
