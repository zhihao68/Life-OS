# Life OS

基于 Expo + React Native 的 Life OS 手机端 V1 原型，按上传的视觉稿实现了 Today、Timeline、Notes、Fitness、Review 五个入口。

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

当前数据使用 React 本地状态，AI、Markdown 文件存储、图片附件、云同步和真实提醒是后续迭代接入点。
