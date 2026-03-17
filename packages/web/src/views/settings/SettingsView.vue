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
          <strong>主侧边栏 + 模块页面</strong>
          <p>当前已经为后续导航、通知、工具页扩展预留了固定壳子。</p>
        </article>

        <article class="setting-card">
          <span>下一阶段</span>
          <strong>迁入真实导航功能</strong>
          <p>后续拉取你的现有导航项目时，可直接映射到网站导航模块内。</p>
        </article>
      </div>
    </section>
  </div>
</template>
