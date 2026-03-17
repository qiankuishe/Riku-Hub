<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '../api';
import AppTopbar from '../components/layout/AppTopbar.vue';
import MainSidebar from '../components/layout/MainSidebar.vue';
import MobileNavDrawer from '../components/layout/MobileNavDrawer.vue';
import { useUiStore } from '../stores/ui';

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();

const title = computed(() => String(route.meta.title ?? 'QianKui'));
const subtitle = computed(() => String(route.meta.subtitle ?? 'Cloudflare Workers 后台'));

watch(
  () => route.fullPath,
  () => {
    uiStore.closeMobileNav();
  }
);

async function logout() {
  await authApi.logout().catch(() => undefined);
  uiStore.closeMobileNav();
  await router.push('/login');
}
</script>

<template>
  <div class="app-shell">
    <transition name="toast-fade">
      <div v-if="uiStore.toastMessage" class="top-toast">
        {{ uiStore.toastMessage }}
      </div>
    </transition>

    <MainSidebar class="desktop-only" />

    <div class="app-shell-main">
      <AppTopbar
        :title="title"
        :subtitle="subtitle"
        :dark-mode="uiStore.darkMode"
        @menu="uiStore.openMobileNav"
        @toggle-theme="uiStore.toggleDarkMode"
        @logout="logout"
      />

      <main class="page-content">
        <router-view />
      </main>
    </div>

    <MobileNavDrawer :open="uiStore.mobileNavOpen" @close="uiStore.closeMobileNav" />
  </div>
</template>
