export interface AppNavItem {
  label: string;
  to: string;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    label: '网站导航',
    to: '/app/nav'
  },
  {
    label: '订阅聚合',
    to: '/app/subscriptions'
  },
  {
    label: '笔记',
    to: '/app/notes'
  },
  {
    label: '剪贴板',
    to: '/app/snippets'
  },
  {
    label: '运行日志',
    to: '/app/logs'
  },
  {
    label: '系统设置',
    to: '/app/settings'
  }
];
