<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { faviconApi } from '../../core/api';

const props = withDefaults(
  defineProps<{
    url: string;
    title: string;
    className?: string;
  }>(),
  {
    className: 'v3-favicon'
  }
);

const imageSrc = ref('');
const fallback = ref(false);
const loading = ref(false);

const host = computed(() => {
  try {
    return new URL(props.url).hostname;
  } catch {
    return '';
  }
});

function reset() {
  fallback.value = false;
  imageSrc.value = host.value ? `https://www.google.com/s2/favicons?sz=64&domain=${host.value}` : '';
}

async function hydrate() {
  if (!props.url) {
    fallback.value = true;
    return;
  }
  loading.value = true;
  try {
    const data = await faviconApi.get(props.url);
    imageSrc.value = data.dataUrl;
  } catch {
    // keep google favicon fallback source
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.url,
  () => {
    reset();
    void hydrate();
  },
  { immediate: true }
);

function handleError() {
  if (host.value && imageSrc.value !== `https://${host.value}/favicon.ico`) {
    imageSrc.value = `https://${host.value}/favicon.ico`;
    return;
  }
  fallback.value = true;
}
</script>

<template>
  <span v-if="fallback || !imageSrc" class="v3-favicon-fallback" :class="className">
    {{ title?.slice(0, 1).toUpperCase() || '?' }}
  </span>
  <img v-else :src="imageSrc" :class="className" :alt="title" loading="lazy" decoding="async" @error="handleError" />
</template>
