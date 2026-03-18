<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    help?: string;
    error?: string;
  }>(),
  {
    help: '',
    error: ''
  }
);
</script>

<template>
  <label class="ui-field">
    <span class="ui-field__label">{{ label }}</span>
    <span class="ui-field__control">
      <slot />
    </span>
    <span v-if="error" class="ui-field__error">{{ error }}</span>
    <span v-else-if="help" class="ui-field__help">{{ help }}</span>
  </label>
</template>
