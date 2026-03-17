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
          subtitle: '统一入口与分类导航骨架，后续直接接入你现有的导航能力。'
        }
      },
      {
        path: 'subscriptions',
        name: 'subscriptions',
        component: () => import('../views/subscriptions/SubscriptionsView.vue'),
        meta: {
          requiresAuth: true,
          title: '订阅聚合',
          subtitle: '管理订阅源、查看订阅链接与刷新聚合缓存。'
        }
      },
      {
        path: 'notes',
        name: 'notes',
        component: () => import('../views/notes/NotesView.vue'),
        meta: {
          requiresAuth: true,
          title: '笔记',
          subtitle: '双栏笔记本，支持自动保存、Markdown 预览和置顶管理。'
        }
      },
      {
        path: 'snippets',
        name: 'snippets',
        component: () => import('../views/snippets/SnippetsView.vue'),
        meta: {
          requiresAuth: true,
          title: '片段库',
          subtitle: '沉淀文本、代码、链接和小图片片段，快速复制与检索。'
        }
      },
      {
        path: 'logs',
        name: 'logs',
        component: () => import('../views/logs/LogsView.vue'),
        meta: {
          requiresAuth: true,
          title: '运行日志',
          subtitle: '查看登录、刷新与订阅请求等最近活动记录。'
        }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/settings/SettingsView.vue'),
        meta: {
          requiresAuth: true,
          title: '系统设置',
          subtitle: '整理系统状态、界面偏好和后续扩展入口。'
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
