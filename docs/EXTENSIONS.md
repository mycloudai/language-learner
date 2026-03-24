# 扩展功能说明

本项目在 [mycloudai-learner](https://github.com/RealKai42/mycloudai-learner) 基础上添加了两项扩展功能，设计原则是最小化对原有代码的修改，便于与上游保持同步。

## 新增功能

### 1. VS Code 伪装模式

打字练习时切换为仿 Visual Studio Code 界面，让周围的人以为你在写代码。

**功能特点：**
- 完整的 VS Code 深色主题 UI（标题栏、侧栏、文件树、编辑器标签、状态栏、终端面板）
- 文件树根据当前词库动态生成假项目文件名
- 行号、面包屑、minimap 等视觉细节
- 一键切换，退出后恢复原有主题

**使用方式：**
- 点击页面右上角的 VS Code 图标按钮开启
- 在 VS Code 模式下，点击右下角状态栏的关闭图标退出

### 2. AI 句子练习

基于当前词库的单词，通过 AI 生成包含该单词的练习句子。

**功能特点：**
- 支持 OpenAI、Anthropic、OpenAI 兼容格式三种 API
- 三种难度：简单（日常）、中等（职场）、困难（学术）
- 两种风格：书面语、口语（含缩写和网络用语）
- AI 生成内容包括：练习句子、语法点解析、词汇注释、目标单词用法说明
- 可设置职业和练习场景，AI 生成相关背景的句子
- 整句自由输入，提交后字符级 diff 对比
- 句子结果缓存在浏览器 IndexedDB 中
- 支持重新生成、缓存管理、复制为 Markdown

**安全设计：**
- 所有 AI API 请求通过后端服务代理，不从浏览器直接发起
- API Key 仅存储在用户浏览器 localStorage 中，通过请求传给后端代理

**使用方式：**
1. 访问 `/sentence-practice` 路由
2. 首次使用时会弹出配置向导，设置 AI 提供商、API Key、模型
3. 配置完成后自动开始生成练习句子

## 项目架构

### 对原有代码的修改

**仅修改了一个文件：** `src/index.tsx`

修改内容：
- 添加 `VSCodeShell` 组件包装
- 添加 `SentencePractice` 懒加载路由
- 添加 `/sentence-practice` 路由

### 新增文件结构

```
src/
├── store/
│   ├── vscodeMode.ts          # VS Code 模式状态 atom
│   └── aiConfig.ts            # AI 配置相关 atoms
├── components/
│   └── VSCodeShell/           # VS Code 伪装壳
│       ├── index.tsx           # 主壳组件
│       ├── TitleBar.tsx        # 标题栏
│       ├── ActivityBar.tsx     # 活动栏
│       ├── FileExplorer.tsx    # 文件树
│       ├── EditorTabs.tsx      # 编辑器标签
│       ├── StatusBar.tsx       # 状态栏
│       ├── VSCodeToggleButton.tsx # 切换按钮
│       └── vscode.css          # VS Code 主题样式
├── pages/
│   └── SentencePractice/      # 句子练习页
│       ├── index.tsx           # 主页面
│       ├── utils.ts            # 工具函数
│       ├── hooks/
│       │   └── useAISentence.ts  # AI 句子生成 hook
│       └── components/
│           ├── SetupWizard.tsx    # AI 配置向导
│           ├── SentencePanel.tsx  # 句子展示
│           ├── InputArea.tsx      # 输入区域
│           ├── DiffView.tsx       # 差异对比
│           ├── AnalysisPanel.tsx  # 知识点分析
│           └── CacheManager.tsx   # 缓存管理
└── utils/
    ├── aiService.ts            # AI API 客户端
    └── sentenceCache.ts        # 句子缓存 (IndexedDB)

server/
├── package.json
└── server.js                   # Express API 代理

deploy/
├── docker-compose.yaml         # Docker Compose 部署
├── Dockerfile.api              # API 服务镜像
├── Dockerfile.frontend         # 前端镜像
├── generate-htpasswd.sh        # 密码生成脚本
├── nginx/
│   ├── default.conf            # 前端 nginx 配置
│   ├── auth-proxy.conf         # 认证代理配置
│   └── .htpasswd               # 密码文件
└── k8s/
    ├── namespace.yaml
    ├── secret.yaml             # htpasswd secret
    ├── configmap.yaml          # nginx 配置
    ├── api.yaml                # API Deployment + Service
    ├── frontend.yaml           # 前端 Deployment + Service
    └── auth-proxy.yaml         # 认证代理 Deployment + Service
```

## 部署

### 开发模式

```bash
# 1. 安装前端依赖并启动
npm install
npm run dev

# 2. 安装并启动后端 API 服务
cd server
npm install
npm run dev
```

前端默认访问 `http://localhost:5173`，API 服务运行在 `http://localhost:3001`。

开发时需要在 Vite 中配置 proxy 或设置环境变量：

```bash
VITE_API_BASE_URL=http://localhost:3001 npm run dev
```

### Docker Compose 部署

```bash
# 1. 生成认证密码文件
cd deploy
./generate-htpasswd.sh admin your_secure_password

# 2. 启动所有服务
docker compose up -d

# 3. 访问 http://localhost:8990（需输入密码）
```

架构：`用户 → auth-proxy (nginx + 密码认证) → frontend (nginx + 静态文件) → api (Node.js)`

### Kubernetes 部署

```bash
# 1. 构建镜像
docker build -t mycloudai-learner-api:latest -f deploy/Dockerfile.api .
docker build -t mycloudai-learner-frontend:latest -f deploy/Dockerfile.frontend .

# 2. 更新密码 Secret
#    先生成 htpasswd 然后 base64 编码，更新 deploy/k8s/secret.yaml

# 3. 部署
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/secret.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/api.yaml
kubectl apply -f deploy/k8s/frontend.yaml
kubectl apply -f deploy/k8s/auth-proxy.yaml

# 4. 访问 NodePort 30080
```

Pod 架构：
```
[auth-proxy Pod]     [frontend Pod]     [api Pod]
nginx + htpasswd  →  nginx + static  →  Node.js Express
     :80                :5173              :3001
```

## 与上游同步

由于只修改了 `src/index.tsx` 一个原始文件（增加 3 行 import + 2 行 route），合并上游更新时冲突概率很低：

```bash
git remote add upstream https://github.com/RealKai42/mycloudai-learner.git
git fetch upstream
git merge upstream/master
# 如果 index.tsx 有冲突，只需保留新增的 import 和 route 即可
```
