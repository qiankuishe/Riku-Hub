import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue'),
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) {
    return true;
  }

  try {
    const response = await fetch('/api/auth/check', { credentials: 'include' });
    const data = (await response.json()) as { authenticated?: boolean };
    if (data.authenticated) {
      return true;
    }
  } catch {
    // noop
  }

  return '/login';
});

export default router;
