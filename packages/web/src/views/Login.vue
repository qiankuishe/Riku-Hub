<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '../api';

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const revealPassword = ref(false);

async function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  try {
    await authApi.login(username.value.trim(), password.value);
    await router.push('/');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-hero">
        <img src="/logo.png" alt="QianKui" class="login-logo" />
        <div>
          <p class="eyebrow">Cloudflare Edition</p>
          <h1>QianKui 聚合</h1>
          <p class="subtitle">订阅聚合、协议转换与安全缓存后台</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <label class="field">
          <span>用户名</span>
          <input v-model="username" autocomplete="username" placeholder="admin" />
        </label>

        <label class="field">
          <span>密码</span>
          <div class="password-row">
            <input
              v-model="password"
              :type="revealPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button type="button" class="ghost small" @click="revealPassword = !revealPassword">
              {{ revealPassword ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>

        <button class="primary wide" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>
