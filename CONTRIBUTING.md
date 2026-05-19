# 贡献指南

欢迎来一起把"刷题宝"做得更好。

## 提 Issue

- **Bug**：描述复现步骤、预期 vs 实际、相关日志
- **新功能**：先描述使用场景（"我想干什么"），再说怎么做。**别只贴需求，先讲痛点**
- **问题/讨论**：欢迎提问，但请先翻一遍 README 和 `docs/`

## 提 PR

- 推荐先在 issue 里聊一下，避免方向走偏白干
- 一个 PR 一件事，别把多个不相关的改动塞一起
- 改前后端的话，请保证：
  - 后端：`cd backend && npm test` 通过（94 tests 不能挂）
  - 前端：`cd frontend && npm run build` 通过（含类型检查）
- Commit message 用中文或英文都行，但要写清"做了什么、为什么"
- 改 schema 必须用 `npx drizzle-kit generate` 生成 migration，不手写 SQL

## 开发原则（来自 `docs/DEV_NOTES.md`）

- **不引入用不到的复杂度**：每加一个依赖问一句"现在真的需要它吗"
- **写代码前先有可视化**：UI 改动先做 HTML 原型给自己看
- **schema 改动先 migration 再 code**：drizzle-kit 是 source of truth
- **dev 启动带内存上限**：`NODE_OPTIONS=--max-old-space-size=2048` 当保险丝

## 联系作者

如果 issue / PR 不方便讨论：
- 微信：522401944（备注"刷题宝 + 你的 GitHub ID"）
- 公众号：云青未眠
