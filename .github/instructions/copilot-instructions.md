---
applyTo: '**/*'
---

# AI Agent 编码规约

> 本文档规范所有 AI Agent（Copilot、Cursor、Windsurf 等）在本项目中的编码行为。

## 项目概述

MyCloudAI-Learner 克隆版：在原始英语打字练习基础上，扩展了 AI 句子练习、VS Code 伪装模式、收藏系统、数据管理面板等功能。

**技术栈一览：**

| 层面         | 技术                                            |
| ------------ | ----------------------------------------------- |
| 前端框架     | React 18 + TypeScript (strict)                  |
| 状态管理     | Jotai (`atomWithStorage` → localStorage 持久化) |
| 客户端数据库 | Dexie.js (IndexedDB) — 打字记录、句子缓存       |
| 数据查询     | SWR                                             |
| 样式         | Tailwind CSS (工具类优先)                       |
| UI 组件      | Radix UI 原语                                   |
| 路由         | React Router v6                                 |
| 构建         | Vite                                            |
| 后端         | Express.js (AI API 代理)                        |
| 测试         | Playwright (e2e)                                |
| 桌面         | Tauri (可选)                                    |

---

## 代码规范

### TypeScript

- **strict 模式**，不允许 `any`；使用精确类型或 `unknown`
- 优先使用 `interface` 定义对象类型；`type` 用于联合类型和工具类型
- 导出类型使用 `export type` / `export interface`
- 组件 props 通过 `interface Props {}` 定义

### 命名

- 组件文件名：PascalCase（`SetupWizard.tsx`）
- 工具函数文件名：camelCase（`aiService.ts`）
- Jotai atoms：小驼峰 + `Atom` 后缀（`aiConfigAtom`）
- Hook 文件名：`use` 前缀（`useAISentence.ts`）
- 常量：UPPER_SNAKE_CASE

### React

- **仅使用函数式组件 + Hooks**；禁止 class component
- 传递给子组件的回调用 `useCallback`，高开销计算用 `useMemo`
- `useEffect` 必须返回 cleanup 函数（如有副作用需清理）
- 不直接操作 DOM，需要时用 `useRef`
- 避免在 render 路径中创建新对象/数组（会导致不必要 re-render）

### 状态管理

- **全局持久状态** → `atomWithStorage`（jotai）存入 localStorage
- **页面内临时状态** → `useState`
- **打字练习记录** → Dexie IndexedDB（`src/utils/db/`）
- **句子缓存** → Dexie IndexedDB（`src/utils/sentenceCache.ts`）— 仅缓存收藏句子
- ⚠️ 直接写 localStorage 不会同步 Jotai atom，必须通过 `useAtom` / `setAtom` 更新

### 样式

- 优先使用 Tailwind 工具类
- 深色模式：`dark:` 前缀配合根 `.dark` class
- 动态计算值场景可用内联 `style`
- 不新增全局 CSS；页面级样式用 CSS Module (`*.module.css`)
- 避免 `!important`

### 安全

- **永远不要**在日志、注释、前端 DOM 中暴露 `apiKey`
- 所有用户输入在进入 AI prompt 前必须清洗
- 外部 URL 需要验证协议为 `http:` 或 `https:`
- `apiKey` 不可写入版本控制或导出文件
- XSS 防护：不使用 `dangerouslySetInnerHTML`，除非对内容已做严格清洗

---

## 文件组织

```
src/
  components/           # 全局通用组件
  pages/
    Typing/             # 原始打字练习页
      components/
        Switcher/       # 工具栏按钮
        Setting/        # 设置面板
    SentencePractice/   # AI 句子练习页
      components/       # 页面子组件
      hooks/            # 句子生成等 hook
  store/                # Jotai atoms (aiConfig, favorites, vscodeMode 等)
  utils/
    db/                 # Dexie 数据库定义 + 数据导出
    aiService.ts        # AI API 调用封装（支持 server/local 双模式）
    sentenceCache.ts    # 句子缓存（仅收藏句子持久化）
    sentenceDataExport.ts  # 收藏数据 JSON 导出/导入
  constants/            # 全局常量
  typings/              # 全局类型定义
  resources/            # 词典资源注册
  hooks/                # 全局通用 hooks
server/                 # Express API 代理服务
deploy/                 # Docker / K8s 部署配置
```

### 新文件放置原则

- 全局通用组件 → `src/components/`
- 页面专属组件 → `src/pages/<PageName>/components/`
- 新 Jotai atom → `src/store/` 中对应文件
- 新词库 → `public/dicts/` + 在 `src/resources/dictionary.ts` 注册
- API 路由 → `server/server.js`

---

## AI 句子功能架构

### 双模式请求

AI 请求支持两种模式（通过 `aiConfig.requestMode` 控制）：

1. **服务器模式 (`server`)**: 前端 → Express → AI Provider
2. **本地模式 (`local`)**: 浏览器直接请求 AI Provider（适用于 CORS 允许的场景）

### 缓存策略

- **只有收藏的句子**在 IndexedDB 中持久保留
- 非收藏句子再次访问时重新生成（不缓存）
- 导出功能只导出收藏句子，不导出缓存

### 数据安全

- `exportSentenceData()` 导出时不含 `apiKey`
- 导入后需重新配置 AI API 密钥

---

## 修改原则

1. **最小修改原则**：只改必须改的文件，不做无关重构
2. **保持一致性**：遵循已有代码风格、缩进、命名
3. **增量添加**：新功能通过新文件/组件实现，减少对已有文件的侵入
4. **测试验证**：修改后运行 `npm run build` 确认无 TypeScript 报错
5. **不破坏现有功能**：修改打字练习页面时不影响现有键位练习逻辑

---

## 构建 & 部署

```bash
# 开发
npm run dev            # Vite dev server (5173)
cd server && npm run dev  # API server (3001)

# 构建
npm run build          # → build/

# 测试
npm run test:e2e       # Playwright e2e

# 部署
deploy/build-and-push.sh  # Docker 构建 + 推送
```

---

## 禁止事项

- ❌ 使用 `any` 类型
- ❌ class component
- ❌ 全局 CSS（不含 Tailwind）
- ❌ 将 apiKey 提交到版本控制
- ❌ `dangerouslySetInnerHTML` 处理未清洗内容
- ❌ 直接修改 `node_modules` 或 `build/` 目录
- ❌ 在 `useEffect` 依赖数组中忽略必要依赖
- ❌ 大量 `eslint-disable` 注释掩盖问题
