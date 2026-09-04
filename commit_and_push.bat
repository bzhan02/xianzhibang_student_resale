@echo off
cd /d C:\Users\rober\student-resale

echo 提交所有改动...
git add -A
git commit -m "feat: realtime chat, avatar upload, 404/error pages, pagination, avatar in cards"

echo 推送到 GitHub（自动触发 Vercel 部署）...
git push origin main

echo.
echo 完成！Vercel 将自动开始部署，约 1-2 分钟后生效。
pause
