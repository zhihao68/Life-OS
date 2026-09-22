# TODO

> 状态说明：☐ 待办 / 🔄 进行中 / ✅ 完成 / ⏸ 阻塞
> 完成某项时请在 DEVLOG.md 中留下对应的验证记录。

## P0 — 产品可用性

- ✅ 真实 AI API 接入：`services/aiService.ts` 已接 OpenAI 兼容接口（中转站 `sxian.my` + `deepseek-v4-flash-0731`），含 JSON 强约束、上下文去重、60s 超时、失败降级本地规则；API 层探测通过，真机端到端待验证（2026-09-22，WorkBuddy）
- ☐ 扩展 `applyPlan` 支持 createNote / createWorkoutPlan / createReminder，再放开 prompt 工具白名单（2026-09-22）
- ✅ 本地数据持久化：`services/storage.ts` 已接 AsyncStorage（key `lifeos-state-v1`），含结构校验、每日滚动补齐周期任务实例（2026-09-18，WorkBuddy）
- ✅ 提醒/通知：expo-notifications 已接入，今日未完成任务自动安排本地提醒，支持"提前 N 分钟"，Web 端安全降级；真机到达效果待验证（2026-09-18，WorkBuddy）

## P1 — Android 真机与构建

- ✅ EAS 云端 APK：build `e1902915`（无 AI 版）用户已真机安装成功；build `78f3ebd9`（含 AI）构建成功，下载链接见 DEVLOG（2026-09-22，WorkBuddy）
- ☐ 本地 Android 开发环境：安装 JDK 17+ 与 Android Studio，`npx expo prebuild --platform android`，验证 `npx expo run:android`
- ✅ eas.json 已创建，preview profile 已配置 `android.buildType = "apk"`（2026-09-04，WorkBuddy）
- ✅ expo-doctor 21/21 通过，SDK 57 依赖已对齐（2026-09-04，WorkBuddy）

## P2 — 功能补全

- ✅ Notes：新增/编辑/删除/搜索/文件夹与标签筛选已实现，数据落盘（2026-09-22，WorkBuddy）
- ☐ Notes 进阶：Markdown 预览、图片附件、双向链接编辑界面
- ✅ 提醒：任务可设提醒时间（准时/提前 10·30 分钟/提前 1 小时/自定义），接 expo-notifications 本地调度 + 通知自检入口（2026-09-22，WorkBuddy；真机到达待验证）
- ✅ Fitness：体重按日期记录 + 趋势图 + 增删改；训练计划与动作支持增删改（2026-09-22，WorkBuddy）
- ✅ 全面屏：接入 react-native-safe-area-context，顶部状态栏与底部安全区统一处理（2026-09-22，WorkBuddy）
- ✅ 交互可用性：全量排查可见按钮，补齐 handler + Toast 反馈 + 跨 Tab 跳转（2026-09-22，WorkBuddy）
- 🔄 Timeline：统一事件流已接入 AI 创建与训练完成事件，普通任务完成尚未自动写入
- 🔄 Review：日/周/月/长期区间统计已改为真实数据计算 + 数据快照导出；AI 深度总结待做

## P3 — 长期架构

- ☐ 云同步与冲突处理（`services/syncService.ts` 接口已预留）
- 🔄 导出：JSON 数据快照已在「总结」页实现（可选中复制）；Markdown / ZIP 待做
- ✅ 测试体系：`npm run verify:logic` 无头逻辑验证套件（14 项断言，直接跑真实业务代码）（2026-09-22，WorkBuddy）

## 已知问题

- 本机无 JDK / Android SDK / Android Studio，本地 APK 编译不可用（依赖云端 EAS 或补装环境）
- 六项修复中的 UI 交互、通知到达、安全区实际效果、持久化重启恢复均未在真机验证（2026-09-22）
- EAS 已出 APK（build `e1902915`）；重新出包需在 `D:\dev\life-os` 目录执行（git insteadOf 重写 + `EAS_SKIP_AUTO_FINGERPRINT=1`，详见 DEVLOG 2026-09-22）
- 通知真实到达效果、Android 13+ 权限弹窗未在真机验证
