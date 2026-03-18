# Riku-Hub

Cloudflare Workers 版的 Riku-Hub 聚合服务，包含完整后台、订阅源管理、预聚合缓存和多格式输出。

## 架构

- `packages/worker`: Cloudflare Worker API、订阅输出、Cron 刷新、KV 存储
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

1. 创建两个 KV namespace，并把 `wrangler.toml` 中的 `id` / `preview_id` 替换掉。
2. 配置 Worker secrets：
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - 可选：`SUB_TOKEN`
3. 管理员密码需要先转成 SHA-256 十六进制字符串。

## 推荐命令

```bash
pnpm install
pnpm dev:web
pnpm dev:worker
pnpm build
pnpm test
```

## 备注

- 当前方案按你的选择采用 `KV 为主`，适合单管理员、低并发后台场景。
- 前端生成的订阅链接固定使用 `https://`。
