<script setup lang="ts">
import type { NavigationCategory } from '../../core/api';

defineProps<{
  category: NavigationCategory;
  selected: boolean;
  editMode: boolean;
}>();

const emit = defineEmits<{
  click: [categoryId: string];
  dragstart: [event: DragEvent, categoryId: string];
  dragover: [event: DragEvent, categoryId: string];
  drop: [event: DragEvent, categoryId: string];
  dragend: [event: DragEvent, categoryId: string];
}>();
</script>

<template>
  <button
    class="v3-chip"
    :class="{ active: selected }"
    :draggable="editMode"
    type="button"
    @click="emit('click', category.id)"
    @dragstart="emit('dragstart', $event, category.id)"
    @dragover.prevent="emit('dragover', $event, category.id)"
    @drop.prevent="emit('drop', $event, category.id)"
    @dragend="emit('dragend', $event, category.id)"
  >
    {{ category.name }} ({{ category.links.length }})
  </button>
</template>
