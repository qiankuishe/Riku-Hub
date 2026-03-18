<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { formatRelativeTime, formatVisitCount } from '../../core/format';

const props = defineProps<{
  visitCount: number;
  lastVisitedAt?: string | null;
  description?: string;
  disabled?: boolean;
}>();

const visible = ref(false);
const top = ref(0);
const left = ref(0);
const triggerRef = ref<HTMLElement | null>(null);
let showTimer = 0;
let hideTimer = 0;

const hasContent = computed(() => Boolean(props.description) || props.visitCount > 0 || props.lastVisitedAt);
const visitText = computed(() => formatVisitCount(props.visitCount));
const timeText = computed(() => formatRelativeTime(props.lastVisitedAt));

function clearTimers() {
  if (showTimer) {
    window.clearTimeout(showTimer);
    showTimer = 0;
  }
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = 0;
  }
}

function updatePosition() {
  const trigger = triggerRef.value;
  if (!trigger) {
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const width = 250;
  const padding = 8;
  let nextLeft = rect.left + rect.width / 2 - width / 2;
  if (nextLeft < padding) {
    nextLeft = padding;
  }
  if (nextLeft + width > window.innerWidth - padding) {
    nextLeft = window.innerWidth - width - padding;
  }

  let nextTop = rect.bottom + 8;
  if (nextTop + 80 > window.innerHeight) {
    nextTop = rect.top - 80 - 8;
  }

  left.value = nextLeft;
  top.value = nextTop;
}

function handleEnter() {
  if (props.disabled || !hasContent.value) {
    return;
  }
  clearTimers();
  showTimer = window.setTimeout(() => {
    updatePosition();
    visible.value = true;
  }, 260);
}

function handleLeave() {
  clearTimers();
  hideTimer = window.setTimeout(() => {
    visible.value = false;
  }, 100);
}

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<template>
  <div ref="triggerRef" @mouseenter="handleEnter" @mouseleave="handleLeave">
    <slot />
  </div>
  <Teleport to="body">
    <div v-if="visible" class="v3-tooltip" :style="{ top: `${top}px`, left: `${left}px` }">
      <div>
        <strong>{{ visitText }}</strong>
        <span v-if="timeText && timeText !== '尚未访问'"> · {{ timeText }}</span>
      </div>
      <div v-if="description">{{ description }}</div>
    </div>
  </Teleport>
</template>
