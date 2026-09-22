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

- ☐ Notes：Markdown 编辑、图片附件、搜索、双向链接
- ☐ Fitness：真实训练记录写入与统计
- ☐ Timeline：统一事件流（Todo/Note/Fitness/Journal/Event）
- ☐ Review：周结/月结数据聚合 + AI 总结

## P3 — 长期架构

- ☐ 云同步与冲突处理（`services/syncService.ts` 接口已预留）
- ☐ 导出：Markdown / JSON / ZIP
- ☐ 测试体系（Jest + 关键 service 单测）

## 已知问题

- 本机无 JDK / Android SDK / Android Studio，本地 APK 编译不可用（依赖云端 EAS 或补装环境）
- EAS 已出 APK（build `e1902915`）；重新出包需在 `D:\dev\life-os` 目录执行（git insteadOf 重写 + `EAS_SKIP_AUTO_FINGERPRINT=1`，详见 DEVLOG 2026-09-22）
- 通知真实到达效果、Android 13+ 权限弹窗未在真机验证
