<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    active?: boolean;
  }>(),
  {
    active: false
  }
);

const emit = defineEmits<{
  dragover: [event: DragEvent];
  drop: [event: DragEvent];
}>();
</script>

<template>
  <div class="v3-category-drop" :class="{ active: props.active }" @dragover.prevent="emit('dragover', $event)" @drop.prevent="emit('drop', $event)">
    <slot />
  </div>
</template>
