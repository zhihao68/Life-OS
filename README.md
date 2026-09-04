# Life OS

基于 Expo + React Native 的 Life OS 手机端 V1 原型，按上传的视觉稿实现了 Today、Timeline、Notes、Fitness、Review 五个入口。本轮在现有工程上完成了 UI/UX 与数据边界重构，没有推倒已有模块。

## 运行

```bash
npm install
npm run start
```

在 Expo Go 中扫描终端二维码即可运行 Android；也可以使用 `npm run web` 打开浏览器预览。

## 已实现

- 首页 AI 自然语言输入：提交一句话后生成一条待安排任务
- 任务勾选与进度统计
- 时间轴任务视图
- 笔记置顶、标签与最近编辑视图
- 健身周计划、训练动作和周统计
- 周总结、完成率指标和 AI 建议
- Android/Web 静态 bundle 导出到 `dist/`

## 当前结构

- `types/`：Task、RecurringTask、Note、Workout、TimelineEvent、Review、AIAction 等领域类型
- `data/`：可替换的种子数据，不再把业务数据写死在页面
- `services/aiService.ts`：Mock AI 与 Life OS Tool 清单，返回结构化 AIPlan
- `services/storage.ts`：Local Database 接口，预留 AsyncStorage/SQLite 实现
- `services/syncService.ts`：同步、冲突处理接口，预留云端适配器
- `utils/recurrence.ts`：把周期任务定义展开为带具体日期的 `recurring-instance`
- `store/`：统一状态与动作，页面不直接操作数据集合
- `components/`：共享安全区、滚动容器、标题、卡片、分段、底部导航、空状态
- `screens/`：五个业务屏幕，统一设计语言

当前数据仍使用 React 本地状态，Mock AI 已支持“解析 → 结构化预览 → 用户确认应用”，并对已有任务做幂等更新。真实 OpenAI API、Markdown 文件持久化、图片附件、云同步、提醒和导出实现是后续接入点，但接口边界已预留。
