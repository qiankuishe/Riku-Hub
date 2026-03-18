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
   - 必需：`CACHE_KV`
   - 必需：`DB`（D1）
3. 配置 Worker secrets：
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - 可选：`SUB_TOKEN`
4. 管理员密码需要先转成 SHA-256 十六进制字符串。

## 存储说明

- `CACHE_KV`：只负责缓存，包括聚合缓存、格式化输出缓存、favicon 缓存、DNS 缓存
- `DB`（D1）：负责所有业务数据，包括登录状态、登录限流、订阅源、订阅 token、聚合元信息、导航、笔记、片段库、运行日志

这就是当前项目的标准部署结构：`1 个 KV + 1 个 D1`。

## 部署步骤

### 1. 创建 KV namespace

```bash
pnpm dlx wrangler kv namespace create CACHE_KV
```

把返回的 `id` 和 `preview_id` 填进 [`wrangler.toml`](/Users/miku/Desktop/Ai开发/qiankui-sub-cf/wrangler.toml) 里对应位置。

### 2. 创建 D1

```bash
pnpm dlx wrangler d1 create riku-hub-db
pnpm dlx wrangler d1 execute riku-hub-db --file ./migrations/0001_app_data.sql
pnpm dlx wrangler d1 execute riku-hub-db --file ./migrations/0002_runtime_data.sql
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

- 部署时按 `CACHE_KV + DB` 配置即可。
- 前端生成的订阅链接固定使用 `https://`。
