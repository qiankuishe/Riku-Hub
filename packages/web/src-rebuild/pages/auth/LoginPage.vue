<script setup lang="ts">
import { ref } from 'vue';
import UiButton from '../../../src/components/ui/UiButton.vue';
import UiField from '../../../src/components/ui/UiField.vue';
import { authApi } from '../../core/api';
import { resolveAppRoute } from '../../../src/utils/routeMemory';

const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const revealPassword = ref(false);

async function login() {
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    await authApi.login(username.value.trim(), password.value);
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    window.location.replace(resolveAppRoute(redirect));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="v3-login-page">
    <section class="v3-login-card">
      <div class="v3-login-head">
        <img class="v3-login-logo" src="/logo.png" alt="Riku-Hub" />
        <div>
          <h1>Riku-Hub</h1>
          <p class="v3-muted">登录后继续使用导航、订阅和知识模块。</p>
        </div>
      </div>

      <form class="v3-list" @submit.prevent="login">
        <UiField label="用户名">
          <input v-model="username" autocomplete="username" placeholder="请输入用户名" />
        </UiField>

        <UiField label="密码">
          <div style="position: relative;">
            <input
              v-model="password"
              :type="revealPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
              style="padding-right: 72px;"
            />
            <button
              type="button"
              class="ui-button ui-button--tertiary ui-button--sm"
              style="position: absolute; top: 7px; right: 7px;"
              @click="revealPassword = !revealPassword"
            >
              {{ revealPassword ? '隐藏' : '显示' }}
            </button>
          </div>
        </UiField>

        <div v-if="errorMessage" class="v3-danger">{{ errorMessage }}</div>
        <UiButton variant="primary" block type="submit" :loading="loading" :disabled="loading">登录</UiButton>
      </form>
    </section>
  </div>
</template>
