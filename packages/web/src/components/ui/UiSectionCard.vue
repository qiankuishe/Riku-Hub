<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
  }>(),
  {
    title: '',
    subtitle: ''
  }
);
</script>

<template>
  <section class="ui-section-card">
    <header v-if="title || subtitle" class="ui-section-card__header">
      <h3 v-if="title">{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>
    <div class="ui-section-card__body">
      <slot />
    </div>
  </section>
</template>
