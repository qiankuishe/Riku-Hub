<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
}>();
</script>

<template>
  <article class="ui-stat-tile">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
  </article>
</template>
