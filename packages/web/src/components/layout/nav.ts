export interface AppNavItem {
  shortLabel: string;
  label: string;
  to: string;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    shortLabel: '导航',
    label: '网站导航',
    to: '/app/nav'
  },
  {
    shortLabel: '订阅',
    label: '订阅聚合',
    to: '/app/subscriptions'
  },
  {
    shortLabel: '笔记',
    label: '笔记',
    to: '/app/notes'
  },
  {
    shortLabel: '片段',
    label: '片段库',
    to: '/app/snippets'
  },
  {
    shortLabel: '日志',
    label: '运行日志',
    to: '/app/logs'
  },
  {
    shortLabel: '设置',
    label: '系统设置',
    to: '/app/settings'
  }
];
