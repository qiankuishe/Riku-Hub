<script setup lang="ts">
import type { NavigationLink } from '../../core/api';
import FaviconImage from './FaviconImage.vue';
import LinkTooltip from './LinkTooltip.vue';

const props = withDefaults(
  defineProps<{
    link: NavigationLink;
    editMode: boolean;
    dragging?: boolean;
    dropTarget?: boolean;
    dropBefore?: boolean;
    dropAfter?: boolean;
  }>(),
  {
    dragging: false,
    dropTarget: false,
    dropBefore: false,
    dropAfter: false
  }
);

const emit = defineEmits<{
  open: [link: NavigationLink];
  edit: [link: NavigationLink];
  remove: [link: NavigationLink];
  dragstart: [event: DragEvent, link: NavigationLink];
  dragend: [event: DragEvent, link: NavigationLink];
  dragover: [event: DragEvent, link: NavigationLink];
  drop: [event: DragEvent, link: NavigationLink];
}>();

function handleOpen() {
  if (props.editMode) {
    return;
  }
  emit('open', props.link);
}
</script>

<template>
  <LinkTooltip :visit-count="link.visitCount" :last-visited-at="link.lastVisitedAt" :description="link.description" :disabled="editMode">
    <article
      class="v3-link-card"
      :class="{
        'is-dragging': dragging,
        'is-drop-target': dropTarget,
        'drop-before': dropBefore,
        'drop-after': dropAfter
      }"
      :draggable="editMode"
      @click="handleOpen"
      @dragstart="emit('dragstart', $event, link)"
      @dragend="emit('dragend', $event, link)"
      @dragover.prevent="emit('dragover', $event, link)"
      @drop.prevent="emit('drop', $event, link)"
    >
      <div class="v3-link-main">
        <FaviconImage :url="link.url" :title="link.title" />
        <div class="v3-link-title">{{ link.title }}</div>
      </div>

      <div v-if="editMode" class="v3-link-actions">
        <button class="v3-icon-btn" type="button" title="编辑" @click.stop="emit('edit', link)">✎</button>
        <button class="v3-icon-btn v3-danger" type="button" title="删除" @click.stop="emit('remove', link)">✕</button>
      </div>
    </article>
  </LinkTooltip>
</template>
