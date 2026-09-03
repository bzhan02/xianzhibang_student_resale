@echo off
cd /d C:\Users\rober\student-resale

echo 当前状态：
git status --short

echo.
echo 提交所有改动...
git add -A
git commit -m "feat: desktop layout, email verify, wechat QR share, 118 schools, bug fixes"

echo.
echo 推送到 GitHub...
git push origin main

echo.
echo 完成！按任意键关闭...
pause
