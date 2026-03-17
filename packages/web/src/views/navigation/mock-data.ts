export interface NavigationCategory {
  key: string;
  label: string;
  description: string;
}

export interface NavigationCard {
  title: string;
  url: string;
  note: string;
  tags: string[];
  category: string;
}

export const NAVIGATION_CATEGORIES: NavigationCategory[] = [
  { key: 'all', label: '全部', description: '预留所有入口的总览视角。' },
  { key: 'favorite', label: '常用', description: '你最常访问的入口可以优先沉淀到这里。' },
  { key: 'development', label: '开发', description: '代码、部署、文档与平台工具。' },
  { key: 'ai', label: 'AI', description: '模型平台、提示词与实验工具。' },
  { key: 'design', label: '设计', description: '视觉、素材、品牌与灵感资源。' },
  { key: 'server', label: '服务器', description: '主机、面板、监控与运维入口。' }
];

export const NAVIGATION_CARDS: NavigationCard[] = [
  {
    title: '项目导航骨架',
    url: 'https://placeholder.local/navigation',
    note: '后续照抄现有导航项目时，这里会替换成真实站点卡片与收藏能力。',
    tags: ['结构'],
    category: 'favorite'
  },
  {
    title: 'Workers 控制台',
    url: 'https://dash.cloudflare.com',
    note: '适合放部署、KV、路由等日常操作入口。',
    tags: ['Cloudflare', '部署'],
    category: 'development'
  },
  {
    title: 'AI 工作区',
    url: 'https://platform.openai.com',
    note: '预留给模型平台与常用实验入口。',
    tags: ['AI', '模型'],
    category: 'ai'
  },
  {
    title: '设计灵感板',
    url: 'https://www.behance.net',
    note: '可用于承接设计参考、素材站与品牌资源。',
    tags: ['视觉', '素材'],
    category: 'design'
  },
  {
    title: '服务器入口',
    url: 'https://example.com/server',
    note: '后面可以放你的自建服务器、面板和监控链接。',
    tags: ['运维', '主机'],
    category: 'server'
  }
];
