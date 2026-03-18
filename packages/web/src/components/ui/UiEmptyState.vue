<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
  }>(),
  {
    description: ''
  }
);
</script>

<template>
  <div class="ui-empty-state">
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <div class="ui-empty-state__actions">
      <slot />
    </div>
  </div>
</template>
