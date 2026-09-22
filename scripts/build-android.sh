#!/usr/bin/env bash
# 安全出包脚本：确保「构建用的代码」与「仓库最新代码」一致后再提交 EAS 构建。
#
# 背景：2026-09-22 曾出现两次 APK 实际是旧版本的事故——构建工作目录
# （D:\dev\life-os）里的 git pull 因为本地残留修改而没生效，EAS 打包的是旧 HEAD，
# 但命令行输出被 tail 截断，没有暴露这个问题。
#
# 用法：bash scripts/build-android.sh [profile]  （默认 preview）
# 依赖：项目 .env 中的 EXPO_TOKEN；构建目录默认 D:/dev/life-os（可用 BUILD_DIR 覆盖）

set -euo pipefail

PROFILE="${1:-preview}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-/d/dev/life-os}"

echo "==> 1/5 检查源仓库状态"
cd "$REPO_DIR"
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 源仓库有未提交修改，请先提交后再出包"
  git status --short
  exit 1
fi
SOURCE_HEAD="$(git rev-parse HEAD)"
echo "    源仓库 HEAD: ${SOURCE_HEAD:0:7}"

echo "==> 2/5 确认该提交已推送到远端"
if ! git branch -r --contains "$SOURCE_HEAD" | grep -q 'origin/main'; then
  echo "❌ 当前提交尚未推送到 origin/main，先 push 再出包"
  exit 1
fi
echo "    已存在于 origin/main ✅"

echo "==> 3/5 清理构建目录并同步代码"
if [ ! -d "$BUILD_DIR/.git" ]; then
  echo "❌ 构建目录不存在 git 仓库：$BUILD_DIR（先执行 git clone）"
  exit 1
fi
cd "$BUILD_DIR"
git checkout -- . 2>/dev/null || true
git clean -fd -e .env -e node_modules 2>/dev/null || true
git pull --ff-only origin main
BUILD_HEAD="$(git rev-parse HEAD)"

if [ "$BUILD_HEAD" != "$SOURCE_HEAD" ]; then
  echo "❌ 构建目录 HEAD(${BUILD_HEAD:0:7}) 与源仓库(${SOURCE_HEAD:0:7}) 不一致，已中止"
  exit 1
fi
echo "    构建目录已同步到 ${BUILD_HEAD:0:7} ✅"

echo "==> 4/5 提交 EAS 构建（profile: $PROFILE，等待完成）"
set -a; . "$REPO_DIR/.env"; set +a
export EAS_SKIP_AUTO_FINGERPRINT=1
npx eas-cli build -p android --profile "$PROFILE" --non-interactive --json > eas-build-result.json

echo "==> 5/5 校验构建产物对应的提交"
BUILD_ID="$(node -e "const r=require('./eas-build-result.json');console.log(Array.isArray(r)?r[0].id:r.id)")"
echo "    构建 ID: $BUILD_ID"
npx eas-cli build:view "$BUILD_ID" --json 2>/dev/null \
  | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d.slice(d.indexOf('{')));
  const expected=process.argv[1];
  console.log('    构建状态:',j.status);
  console.log('    versionCode:',j.appBuildVersion);
  console.log('    构建提交:',(j.gitCommitHash||'').slice(0,7));
  console.log('    APK:',j.artifacts&&j.artifacts.buildUrl);
  if(j.gitCommitHash!==expected){console.error('❌ 构建提交与期望不一致！产物可能不是最新代码');process.exit(1);} 
  console.log('    ✅ 构建提交与源码一致');
});
" "$BUILD_HEAD"
