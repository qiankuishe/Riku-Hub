# Riku-Hub

Cloudflare Workers 版的 Riku-Hub 聚合服务，包含完整后台、订阅源管理、预聚合缓存和多格式输出。

## 架构

- `packages/worker`: Cloudflare Worker API、订阅输出、Cron 刷新、KV / D1 存储
- `packages/shared`: 协议类型、解析器、转换器、去重和缓存模型
- `packages/web`: Vue 3 管理后台

## 当前能力

- 订阅链接继续支持 `/sub?{token}` 和 `/sub?{token}&{format}`
- 后台支持登录、订阅源增删改查、排序、校验、手动刷新、日志查看
- 强制 `https://` 展示与访问
- 预聚合缓存与回源兜底
- 修复原项目中的这些问题：
  - 去重误杀同机同端口不同账号节点
  - WireGuard 文档和实际支持不一致
  - SSRF 只做字面值检查
  - 相对重定向处理失败

## 环境准备

1. 安装依赖：
   - `pnpm install`
2. 创建 Cloudflare 资源，并把结果填到 [`wrangler.toml`](/Users/miku/Desktop/Ai开发/qiankui-sub-cf/wrangler.toml)：
   - 必需：`APP_KV`
   - 必需：`CACHE_KV`
   - 推荐：`DB`（D1）
3. 配置 Worker secrets：
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - 可选：`SUB_TOKEN`
4. 管理员密码需要先转成 SHA-256 十六进制字符串。

## 存储说明

### 最小部署

- `APP_KV`：登录会话、登录限流、订阅源、订阅 token、聚合元信息
- `CACHE_KV`：聚合缓存、格式化输出缓存、favicon 缓存、DNS 缓存

这种方式可以直接跑起来，但后台写入多时容易撞上 Cloudflare KV 免费版 `1,000 writes/day` 的限制。

### 推荐部署

- `APP_KV`：保留登录会话、订阅源、token、少量全局状态
- `CACHE_KV`：只负责缓存
- `DB`（D1）：导航分类和链接、笔记、片段库、运行日志

这是当前项目更推荐的部署方式，尤其适合你这种会频繁在后台增删改数据的用法。

## 部署步骤

### 1. 创建两个 KV namespace

```bash
pnpm dlx wrangler kv namespace create APP_KV
pnpm dlx wrangler kv namespace create CACHE_KV
```

把返回的 `id` 和 `preview_id` 填进 [`wrangler.toml`](/Users/miku/Desktop/Ai开发/qiankui-sub-cf/wrangler.toml) 里对应位置。

### 2. 可选但推荐：创建 D1

```bash
pnpm dlx wrangler d1 create riku-hub-db
pnpm dlx wrangler d1 execute riku-hub-db --file ./migrations/0001_app_data.sql
```

然后把返回的 `database_id` 填进 [`wrangler.toml`](/Users/miku/Desktop/Ai开发/qiankui-sub-cf/wrangler.toml) 的 `[[d1_databases]]` 段。

### 3. 设置 secrets

```bash
pnpm dlx wrangler secret put ADMIN_USERNAME
pnpm dlx wrangler secret put ADMIN_PASSWORD_HASH
pnpm dlx wrangler secret put SUB_TOKEN
```

### 4. 构建和部署

```bash
pnpm build
pnpm dlx wrangler deploy
```

## 推荐命令

```bash
pnpm install
pnpm dev:web
pnpm dev:worker
pnpm build
pnpm test
```

## 备注

- 如果你不绑定 `DB`，项目会自动回退到纯 `KV` 模式。
- 如果你绑定了 `DB`，导航、笔记、片段和日志会自动改走 D1。
- 前端生成的订阅链接固定使用 `https://`。
