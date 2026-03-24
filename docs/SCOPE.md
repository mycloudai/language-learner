# 项目功能范围说明

## 原始项目功能（mycloudai-learner）

- **打字练习**：按章节拼写单词，实时统计速度与正确率
- **词库管理**：内置大量词库（四六级、考研、托福、雅思、编程关键字等），用户可自定义导入
- **错题本**：记录拼错的单词，支持专项练习
- **复习模式**：基于遗忘曲线的复习计划
- **数据统计**：`AnalysisPanel` 展示打字速度、准确率趋势
- **数据导出/导入**：使用 Dexie + dexie-export-import 将 IndexedDB 数据压缩为 `.gz` 备份文件

---

## 本项目新增功能（克隆扩展版）

### 1. VS Code 伪装模式

- **功能**：将界面外壳替换为类 VS Code 编辑器外观（活动栏 + 侧边栏 + 编辑区），在办公场景下降低辨识度
- **相关文件**：
  - `src/store/vscodeMode.ts` — `isVSCodeModeAtom`
  - `src/components/VSCodeLayout/` — 活动栏、侧边栏布局
  - `src/components/ActivityBar/` — 图标导航栏
  - `src/components/FileExplorer/` — 侧边栏面板（SearchPanel、WordListPanel、FavoritesPanel 等）

### 2. AI 句子练习

- **功能**：调用本地/远程大语言模型，为当前词库单词生成包含该词的例句；用户抄写例句，完成后展示语法解析
- **路由**：`/sentence-practice`
- **相关文件**：
  - `src/pages/SentencePractice/index.tsx` — 主页面
  - `src/pages/SentencePractice/components/` — SentencePanel、InputArea、DiffView、AnalysisPanel 等
  - `src/pages/SentencePractice/hooks/useAISentence.ts` — 句子生成逻辑
  - `src/utils/aiService.ts` — 调用后端 API
  - `server.js` / `src/server/` — 本地代理服务，转发 LLM 请求
- **配置**：首次使用弹出 `SetupWizard`，填写 API Key、Base URL、Model 名称

### 3. 收藏系统

- **功能**：在 AI 句子练习中将喜欢的例句加星收藏；通过 `FavoritesManager` 全屏管理、随时复习
- **相关文件**：
  - `src/store/favorites.ts` — `FavoriteSentence` 接口 + `favoriteSentencesAtom`（atomWithStorage）
  - `src/pages/SentencePractice/components/FavoritesManager.tsx` — 收藏管理全屏模态框
  - `src/components/FileExplorer/FavoritesPanel.tsx` — VS Code 侧边栏中快速查看收藏

### 4. AI 教师聊天

- **功能**：针对当前句子中的单词，浮动对话窗口多轮追问 AI 教师（解释用法、造句等）
- **相关文件**：
  - `src/pages/SentencePractice/components/AIChatDialog.tsx`
  - `src/utils/aiService.ts` — `askTeacher()` 方法
  - `server.js` — `POST /api/ai/ask-teacher` 端点

### 5. 数据导出扩展

| 数据范围                           | 入口                                              | 格式                            |
| ---------------------------------- | ------------------------------------------------- | ------------------------------- |
| 打字练习记录（IndexedDB）          | 设置 → 数据设置 / 工具栏综合数据面板              | `.gz`（gzip 压缩的 Dexie 快照） |
| AI 句子收藏 + 配置（localStorage） | 句子练习页 → 导出句子数据 / 工具栏综合数据面板    | `.json`                         |
| 两者统一备份                       | 工具栏「综合数据面板」（打字页 + 句子页均可打开） | 分别导出上述两种格式            |

- **相关文件**：
  - `src/utils/sentenceDataExport.ts` — `exportSentenceData()` / `importSentenceData()`
  - `src/components/UnifiedDataPanel.tsx` — 综合数据面板组件

### 6. 词库掌握分析

- **功能**：查询当前词库在 IndexedDB 中的打字记录，按单词统计熟练度（零错率），展示覆盖率、分布图、需加强单词列表
- **入口**：句子练习页工具栏图表图标 / 打字页 Switcher 柱状图图标
- **相关文件**：
  - `src/components/MasteryAnalysisPanel.tsx`

---

## 技术约束

- **最小界面修改原则**：所有新功能以加按钮/加模态框方式接入，不修改原始布局结构
- **数据存储**：打字记录 → Dexie（IndexedDB）；句子相关配置与收藏 → Jotai `atomWithStorage`（localStorage）
- **不引入新路由**：除 `/sentence-practice` 外不新增页面路由
- **API Key 安全**：导出句子数据时自动剔除 `apiKey` 字段
