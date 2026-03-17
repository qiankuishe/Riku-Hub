<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';

const uiStore = useUiStore();
const currentOrigin = computed(() => window.location.origin);
</script>

<template>
  <div class="page-shell page-shell-compact">
    <section class="panel compact-panel">
      <div class="section-head">
        <div>
          <h2>系统设置</h2>
          <p class="section-subtitle">这一页先承担偏好与系统信息，后面再逐步扩成完整设置中心。</p>
        </div>
      </div>

      <div class="settings-grid">
        <article class="setting-card">
          <span>当前主题</span>
          <strong>{{ uiStore.darkMode ? '深色模式' : '浅色模式' }}</strong>
          <button class="ghost small" @click="uiStore.toggleDarkMode">切换主题</button>
        </article>

        <article class="setting-card">
          <span>当前域名</span>
          <strong>{{ currentOrigin }}</strong>
          <p>订阅链接会跟随当前访问域名自动生成 HTTPS 地址。</p>
        </article>

        <article class="setting-card">
          <span>后台结构</span>
          <strong>6 个一级页面</strong>
          <p>网站导航、订阅聚合、笔记、片段库、运行日志和系统设置已经统一到同一套后台里。</p>
        </article>

        <article class="setting-card">
          <span>当前能力</span>
          <strong>导航 + 笔记 + 片段库</strong>
          <p>新模块已接入 Worker + KV 架构，后面可以继续往这套壳子里加更多功能。</p>
        </article>
      </div>
    </section>
  </div>
</template>
