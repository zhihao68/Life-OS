# Life OS 多 Agent 协作开发规则

## 最高原则

本项目由多个 AI Agent 协同开发，例如 Codex、Work Buddy。

所有 Agent 都是完整的软件开发 Agent。

任何 Agent 都可以：

- 阅读整个项目
- 分析产品需求
- 修改 UI
- 修改业务逻辑
- 修改数据层
- 修改 AI
- 修改 API
- 修改数据库
- 修改配置
- 修改测试
- 修改文档

**不要按照 Agent 名称限制开发权限。**

Codex 不等于只能做后端。

Work Buddy 不等于只能做 UI。

真正的职责划分以当前任务为准。

---

# 1. 每次开始任务前必须做

在修改代码之前，必须依次：

### 读取项目状态

读取：

- README.md
- AGENTS.md
- DEVLOG.md
- TODO.md
- docs/ 下与当前任务相关的文档

然后检查：

```bash
git status
git branch
git log -5 --oneline
git diff
```

必须先理解当前代码状态，再开始修改。

---

# 2. 任务优先于 Agent 身份

任务由项目负责人分配。

例如：

“优化首页”

可以由 Codex 完成，也可以由 Work Buddy 完成。

例如：

“设计 AI 一句话生成计划”

可以同时涉及：

- UI
- AI
- 数据
- Service
- API
- 数据库

负责 Agent 可以根据任务需要修改所有相关内容。

不要因为自己是 Codex 或 Work Buddy，就拒绝修改其他类型的代码。

---

# 3. 不允许擅自扩大需求

完成当前任务时：

优先解决当前任务。

发现其他问题：

可以：

1. 记录到 DEVLOG.md
2. 添加到 TODO.md
3. 必要时向项目负责人说明

不要为了“顺便优化”而大范围重构整个项目。

---

# 4. 每次修改后必须记录 DEVLOG

这是强制要求。

**任何一次实际代码修改都必须更新 DEVLOG.md。**

无论修改大小：

- 一个组件
- 一个页面
- 一个配置
- 一个数据库字段
- 一个 AI Prompt
- 一个 Bug
- 一个图标
- 一个依赖

都必须记录。

---

# 5. DEVLOG 格式

每次新增一条日志：

```markdown
## YYYY-MM-DD HH:mm

### Agent
Codex / Work Buddy

### 任务
<本次任务名称>

### 目标
<本次准备解决什么问题>

### 修改文件

- `路径/文件1`
- `路径/文件2`
- `路径/文件3`

### 实际修改

- 文件1：修改了什么
- 文件2：修改了什么
- 文件3：修改了什么

### 新增

- 新增了哪些文件/功能

### 删除

- 删除了哪些文件/代码

### 为什么修改

<修改原因>

### 验证

- TypeScript：✅ / ❌ / ⚠️
- Expo Doctor：✅ / ❌ / ⚠️
- Web：✅ / ❌ / ⚠️
- Android Bundle：✅ / ❌ / ⚠️
- Android APK：✅ / ❌ / ⚠️
- 其他测试：✅ / ❌ / ⚠️

只能记录实际执行过的验证。

禁止把没有执行的测试写成“通过”。

### 未完成

<没有完成的内容>

### 已知问题 / 风险

<目前发现的问题>

### 给下一位 Agent 的信息

<下一位 Agent 接手时需要知道什么>

### Git Commit

<commit hash>
```

---

# 6. 日志必须基于真实修改

禁止：

“优化了首页。”

必须说明：

“修改了哪些文件、每个文件改了什么。”

推荐通过：

```bash
git diff
```

确认实际修改内容后再填写 DEVLOG。

---

# 7. Git 规范

完成一个相对独立的任务后进行 commit。

格式：

```text
[Agent] type: description
```

例如：

```text
[Codex] feat: add ai daily plan
[WorkBuddy] ui: redesign home dashboard
[Codex] fix: recurring task date calculation
```

Commit message 必须描述实际工作。

---

# 8. 不得破坏其他 Agent 的工作

如果发现：

```bash
git status
```

存在未提交修改：

不要执行：

```bash
git reset --hard
```

不要删除未知来源代码。

先查看：

```bash
git diff
```

判断哪些修改属于当前任务。

如果发现冲突：

在 DEVLOG.md 中记录。

---

# 9. 产品需求不得擅自改变

Life OS 当前核心方向：

### Todo

- 一次性任务
- 周期任务
- 提醒

### Notes

- Markdown
- 图片
- 标签
- 搜索
- 双向链接
- 关联内容

### Fitness

- 每周训练计划
- 每日训练
- 完成记录
- 训练数据

### Timeline

统一展示用户的时间记录：

- Todo
- Note
- Fitness
- Journal
- Event

### Review

- 周结
- 月结
- AI 总结

### AI

核心体验：

> 用户表达意愿 → AI 自动生成计划、任务、提醒和相关内容。

例如：

“今天我要处理论文、晚上健身、睡前学英语。”

系统自动生成：

- 今日任务
- 时间安排
- 提醒
- 健身安排

---

# 10. AI 不是普通聊天框

AI 应当逐渐成为 Life OS 的自然语言操作入口。

未来 AI 可以执行：

```text
createTask
createRecurringTask
createReminder
createNote
createWorkoutPlan
updateTask
deleteTask
getTodayData
getWeekData
generateReview
```

AI 逻辑与 UI 尽可能解耦。

---

# 11. 数据架构

Life OS 最终需要支持：

- 本地数据
- 离线
- 云同步
- 多设备
- 数据备份
- 数据恢复
- Markdown 导出
- JSON 导出
- ZIP 导出

不要把核心数据永久放在 React state 中。

---

# 12. 当前开发优先级

开发 Agent 应优先根据项目负责人当前指令执行。

如果没有明确任务：

优先查看：

```text
TODO.md
DEVLOG.md
README.md
```

选择最高优先级、最影响产品可用性的任务处理。

不得擅自大规模增加新模块。

---

# 13. 每次任务完成必须做的事情

无论任务大小，完成后必须：

1. 检查实际代码修改
2. 执行相关测试
3. 更新 DEVLOG.md
4. 必要时更新 TODO.md
5. 提交 Git
6. 给出最终汇报

最终汇报必须包含：

```text
完成：
修改文件：
新增：
删除：
验证：
未完成：
风险：
下一步：
Git Commit：
```

---

# 14. Agent 之间的交接

DEVLOG.md 是 Agent 之间的重要交接记录。

下一位 Agent 开始任务时，应先阅读最近的 DEVLOG。

如果上一位 Agent 明确写了：

“下一步建议……”

下一位 Agent 应结合当前任务判断是否执行。

不能盲目覆盖前一个 Agent 的工作。

---

# 15. 真实性要求

禁止：

- 假装测试成功
- 假装构建成功
- 假装 API 已连接
- 假装 APK 已生成
- 假装数据库已经接入
- 假装同步已经实现

必须区分：

“代码完成”

和：

“实际验证完成”。

---

# 16. 最终目标

Life OS 不是简单的 Todo + Notes App。

最终目标：

```text
用户表达意愿
        ↓
AI 理解
        ↓
生成计划
        ↓
创建任务
        ↓
提醒
        ↓
执行
        ↓
记录
        ↓
Timeline
        ↓
Review
        ↓
AI 分析
        ↓
下一阶段计划
```

每一次开发都应该让这个闭环更加完整。
