<script setup lang="ts">
import { computed } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    block?: boolean;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    loading: false,
    block: false,
    type: 'button',
    disabled: false
  }
);

const classes = computed(() => [
  'ui-button',
  `ui-button--${props.variant}`,
  `ui-button--${props.size}`,
  props.block ? 'ui-button--block' : ''
]);
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading">
    <span class="ui-button__label">
      <slot />
    </span>
    <span v-if="loading" class="ui-button__loading">...</span>
  </button>
</template>
