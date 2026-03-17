<script setup lang="ts">
import { computed, ref } from 'vue';
import NavigationCategorySidebar from './components/NavigationCategorySidebar.vue';
import NavigationSiteGrid from './components/NavigationSiteGrid.vue';
import { NAVIGATION_CARDS, NAVIGATION_CATEGORIES } from './mock-data';

const activeCategory = ref('all');

const activeCategoryLabel = computed(
  () => NAVIGATION_CATEGORIES.find((category) => category.key === activeCategory.value)?.label ?? '全部'
);

const filteredCards = computed(() => {
  if (activeCategory.value === 'all') {
    return NAVIGATION_CARDS;
  }
  return NAVIGATION_CARDS.filter((card) => card.category === activeCategory.value);
});
</script>

<template>
  <div class="page-shell page-shell-wide">
    <section class="panel nav-hero-panel">
      <div class="section-head">
        <div>
          <h2>导航模块骨架</h2>
          <p class="section-subtitle">这里先把全局壳子和分类结构搭好，下一步可以直接照抄你现有导航项目的功能。</p>
        </div>
      </div>

      <div class="nav-hero-grid">
        <div class="metric-card">
          <span>默认首页</span>
          <strong>网站导航</strong>
        </div>
        <div class="metric-card">
          <span>分类结构</span>
          <strong>全局侧边栏 + 局部二级栏</strong>
        </div>
        <div class="metric-card">
          <span>当前数据源</span>
          <strong>前端静态占位</strong>
        </div>
        <div class="metric-card">
          <span>下一步</span>
          <strong>迁入现有导航项目功能</strong>
        </div>
      </div>
    </section>

    <div class="nav-workspace">
      <NavigationCategorySidebar
        :categories="NAVIGATION_CATEGORIES"
        :active-key="activeCategory"
        @select="activeCategory = $event"
      />
      <NavigationSiteGrid :cards="filteredCards" :active-label="activeCategoryLabel" />
    </div>
  </div>
</template>
