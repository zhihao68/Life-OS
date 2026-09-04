# Life OS 多 Agent 协作开发规范

本项目是 Life OS 手机 App，使用 Expo + React Native 开发。

项目由多个 Agent 协同开发，包括 Codex、Work Buddy 等。

所有 Agent 必须遵守以下规则。

---

## 1. 开始工作前

在修改任何代码之前，必须先读取：

- README.md
- AGENTS.md
- DEVLOG.md
- TODO.md
- 当前 Git 状态
- 与当前任务相关的 docs/

然后确认：

- 当前项目使用的技术栈
- 当前已经完成的功能
- 最近一次 Agent 做了什么
- 当前是否存在未提交修改
- 当前是否存在其他 Agent 正在进行的工作

禁止直接覆盖未确认来源的修改。

---

## 2. 修改原则

每次只围绕当前任务修改，不要顺手重构无关代码。

不要擅自改变产品需求。

如果发现架构问题：

- 可以记录问题
- 可以提出建议
- 除非当前任务明确要求，否则不要大范围修改

优先保持现有功能正常。

---

## 3. 每次修改必须留下真实记录

每次完成任务后必须更新：

`DEVLOG.md`

日志必须基于实际修改，不允许凭记忆简单描述。

必须包含：

### 时间

YYYY-MM-DD HH:mm

### Agent

Codex / Work Buddy / 其他

### 任务

本次任务名称

### 修改文件

列出所有实际修改、新增、删除的文件。

### 具体修改

逐项说明每个文件实际改了什么。

### 修改原因

为什么这样修改。

### 验证

记录实际执行过的：

- TypeScript
- Expo Doctor
- Web
- Android Bundle
- Android Build
- 测试
- 其他相关检查

必须明确写：

✅ 通过

❌ 失败

⚠️ 未执行

不能把未执行的检查写成通过。

### 未完成

明确记录没有完成的部分。

### 风险

记录可能影响其他功能的问题。

### 下一步

告诉下一位 Agent 下一步应该做什么。

---

## 4. Git 规则

每个完成的独立功能都必须进行 Git commit。

commit 格式：

`[Agent] type: description`

例如：

`[Codex] feat: add ai task action`

`[WorkBuddy] ui: improve today screen`

`[Codex] fix: recurring task scheduling`

禁止使用：

- `update`
- `fix`
- `change`
- `test`

这种无法说明实际内容的提交信息。

---

## 5. 不允许假装完成

如果：

- 没有成功运行
- 没有成功构建
- 没有真实测试
- 没有真实调用 API

必须明确说明。

特别禁止把：

“代码已经写好”

说成：

“功能已经验证完成”。

---

## 6. 多 Agent 冲突处理

如果 Git 工作区存在其他 Agent 未提交修改：

不要直接覆盖。

先：

1. 查看 git diff
2. 判断修改归属
3. 尽量只修改自己的目标文件
4. 如果可能产生冲突，记录到 DEVLOG.md

禁止直接：

`git reset --hard`

禁止删除其他 Agent 的修改。

---

## 7. 项目当前产品原则

Life OS 核心理念：

“用户表达意愿，AI 把意愿变成可执行计划。”

核心模块：

- Home
- Todo
- Recurring Tasks
- Reminder
- Timeline
- Notes
- Fitness
- Review
- AI
- Data Sync
- Data Export

核心闭环：

用户意愿  
→ AI 理解  
→ 生成计划  
→ 创建任务  
→ 提醒  
→ 执行  
→ 记录  
→ Review  
→ AI 分析  
→ 下一阶段计划

---

## 8. 数据架构原则

UI 不应该直接承担核心业务逻辑。

应该尽可能保持：

UI  
→ Service  
→ Store / Database  
→ Sync

AI：

UI  
→ AI Service  
→ AI Action  
→ Business Service  
→ Database

核心实体至少包括：

- User
- Goal
- Task
- RecurringTask
- TaskInstance
- Reminder
- Note
- Attachment
- WorkoutPlan
- Workout
- TimelineEvent
- DailyLog
- WeeklyReview
- MonthlyReview
- AIAction

---

## 9. AI 操作原则

AI 以后必须能够通过结构化 Action 操作 Life OS。

例如：

- `createTask`
- `createRecurringTask`
- `createReminder`
- `createNote`
- `createWorkoutPlan`
- `updateTask`
- `getTodayData`
- `getWeekData`
- `generateReview`

不要把 AI 逻辑直接写死在 UI 页面。

当前没有真实 AI API 时可以使用 Mock AI Service，但必须保留以后接入真实模型的接口。

---

## 10. 数据长期可用原则

Life OS 必须考虑：

- Local First
- Offline
- Cloud Sync
- Backup
- Restore
- Markdown Export
- JSON Export
- ZIP Export
- 图片附件同步
- 多设备同步
- 数据冲突

不能把用户核心数据永久绑定在 React state 中。

---

## 11. UI 原则

这是手机 App。

优先考虑：

- 单手操作
- Safe Area
- Bottom Navigation
- Bottom Sheet
- 键盘
- 手势
- 小屏适配
- 点击反馈
- 加载状态
- 空状态

视觉：

极简  
现代  
克制  
高级  
长期耐看

不要做成传统后台管理系统。

---

## 12. 完成任务后的固定汇报

每个 Agent 完成工作后，必须输出：

【完成】  
本次完成什么。

【修改文件】  
哪些文件发生了变化。

【新增】  
哪些文件新增。

【删除】  
哪些文件删除。

【验证】  
实际执行了什么以及结果。

【未完成】  
哪些内容没有完成。

【风险】  
目前有什么风险。

【下一步】  
下一位 Agent 建议做什么。

【Git】  
commit hash。
