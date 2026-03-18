import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/app/nav'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue')
  },
  {
    path: '/app',
    component: () => import('../layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/app/nav'
      },
      {
        path: 'nav',
        name: 'navigation',
        component: () => import('../views/navigation/NavigationView.vue'),
        meta: {
          requiresAuth: true,
          title: '网站导航',
          subtitle: ''
        }
      },
      {
        path: 'subscriptions',
        name: 'subscriptions',
        component: () => import('../views/subscriptions/SubscriptionsView.vue'),
        meta: {
          requiresAuth: true,
          title: '订阅聚合',
          subtitle: ''
        }
      },
      {
        path: 'notes',
        name: 'notes',
        component: () => import('../views/notes/NotesView.vue'),
        meta: {
          requiresAuth: true,
          title: '笔记',
          subtitle: ''
        }
      },
      {
        path: 'snippets',
        name: 'snippets',
        component: () => import('../views/snippets/SnippetsView.vue'),
        meta: {
          requiresAuth: true,
          title: '片段库',
          subtitle: ''
        }
      },
      {
        path: 'logs',
        name: 'logs',
        component: () => import('../views/logs/LogsView.vue'),
        meta: {
          requiresAuth: true,
          title: '运行日志',
          subtitle: ''
        }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/settings/SettingsView.vue'),
        meta: {
          requiresAuth: true,
          title: '系统设置',
          subtitle: ''
        }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  if (!to.matched.some((record) => record.meta.requiresAuth)) {
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
