<script setup lang="ts">
import type { NavigationCategory } from '../mock-data';

defineProps<{
  categories: NavigationCategory[];
  activeKey: string;
}>();

const emit = defineEmits<{
  select: [key: string];
}>();
</script>

<template>
  <aside class="nav-section-sidebar">
    <button
      v-for="category in categories"
      :key="category.key"
      class="nav-section-link"
      :class="{ 'nav-section-link-active': category.key === activeKey }"
      @click="emit('select', category.key)"
    >
      <strong>{{ category.label }}</strong>
      <span>{{ category.description }}</span>
    </button>
  </aside>
</template>
