<script setup lang="ts">
import type { NavigationCard } from '../mock-data';

defineProps<{
  cards: NavigationCard[];
  activeLabel: string;
}>();
</script>

<template>
  <section class="panel nav-grid-panel">
    <div class="section-head">
      <div>
        <h2>{{ activeLabel }}</h2>
        <p class="section-subtitle">现在先用静态骨架承接，后续直接映射真实导航项目的数据与交互。</p>
      </div>
    </div>

    <div class="nav-card-grid">
      <article v-for="card in cards" :key="`${card.category}-${card.title}`" class="nav-card">
        <div class="nav-card-head">
          <h3>{{ card.title }}</h3>
          <a :href="card.url" target="_blank" rel="noreferrer">打开</a>
        </div>
        <p>{{ card.note }}</p>
        <div class="nav-tag-row">
          <span v-for="tag in card.tags" :key="tag" class="nav-tag">{{ tag }}</span>
        </div>
      </article>
    </div>
  </section>
</template>
