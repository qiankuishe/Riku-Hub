<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import UiButton from './UiButton.vue';

type DialogSize = 'sm' | 'md' | 'lg';
type DialogTone = 'default' | 'danger';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    size?: DialogSize;
    tone?: DialogTone;
    confirmText?: string;
    cancelText?: string;
    confirmLoading?: boolean;
    confirmDisabled?: boolean;
    closeDisabled?: boolean;
  }>(),
  {
    description: '',
    size: 'md',
    tone: 'default',
    confirmText: '确认',
    cancelText: '取消',
    confirmLoading: false,
    confirmDisabled: false,
    closeDisabled: false
  }
);

const emit = defineEmits<{
  close: [];
  confirm: [];
  cancel: [];
}>();

const cardRef = ref<HTMLElement | null>(null);

const classes = computed(() => [
  'ui-dialog',
  `ui-dialog--${props.size}`,
  props.tone === 'danger' ? 'ui-dialog--danger' : ''
]);

function focusFirstInteractive() {
  const root = cardRef.value;
  if (!root) {
    return;
  }
  const target = root.querySelector<HTMLElement>(
    'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
  );
  target?.focus();
}

function handleEsc(event: KeyboardEvent) {
  if (!props.open || props.closeDisabled || event.key !== 'Escape') {
    return;
  }
  emit('close');
}

function handleBackdropClick() {
  if (props.closeDisabled) {
    return;
  }
  emit('close');
}

function handleCancel() {
  emit('cancel');
  emit('close');
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return;
    }
    await nextTick();
    focusFirstInteractive();
  }
);

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', handleEsc);
      return;
    }
    window.removeEventListener('keydown', handleEsc);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEsc);
});
</script>

<template>
  <div v-if="open" class="ui-dialog-backdrop" @click.self="handleBackdropClick">
    <section ref="cardRef" :class="classes">
      <header class="ui-dialog__header">
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </header>

      <div class="ui-dialog__body">
        <slot />
      </div>

      <footer class="ui-dialog__footer">
        <slot name="footer">
          <UiButton variant="tertiary" :disabled="closeDisabled || confirmLoading" @click="handleCancel">
            {{ cancelText }}
          </UiButton>
          <UiButton
            :variant="tone === 'danger' ? 'danger' : 'primary'"
            :loading="confirmLoading"
            :disabled="confirmDisabled"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </UiButton>
        </slot>
      </footer>
    </section>
  </div>
</template>
