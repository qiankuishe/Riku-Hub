export interface AppNavItem {
  label: string;
  to: string;
  caption: string;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    label: '网站导航',
    to: '/app/nav',
    caption: '入口页'
  },
  {
    label: '订阅聚合',
    to: '/app/subscriptions',
    caption: '核心功能'
  },
  {
    label: '运行日志',
    to: '/app/logs',
    caption: '状态追踪'
  },
  {
    label: '系统设置',
    to: '/app/settings',
    caption: '偏好与信息'
  }
];
