# TODO

> 状态说明：☐ 待办 / 🔄 进行中 / ✅ 完成 / ⏸ 阻塞
> 完成某项时请在 DEVLOG.md 中留下对应的验证记录。

## P0 — 产品可用性

- ☐ 真实 AI API 接入：替换 `services/aiService.ts` 中的 Mock，接入 OpenAI/兼容 API，保留"解析 → 结构化预览 → 用户确认"流程（负责人需提供 API Key 方案）
- ☐ 本地数据持久化：把 `services/storage.ts` 接上 AsyncStorage 或 expo-sqlite，业务数据移出 React state
- ☐ 提醒/通知：expo-notifications 本地提醒，任务到期触发

## P1 — Android 真机与构建

- ☐ EAS 云端 APK：登录 Expo 账号（`npx eas-cli login`）→ `npx eas-cli init` → `npx eas-cli build -p android --profile preview`，验证 APK 可安装
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
- EAS 尚未登录账号，APK 构建未实际执行过
