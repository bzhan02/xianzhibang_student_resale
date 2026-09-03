@echo off
cd /d C:\Users\rober\student-resale

echo [1/3] 切换远程仓库地址...
git remote set-url origin https://github.com/bzhan02/xianzhibang_student_resale.git

echo [2/3] 提交所有改动...
git add -A
git commit -m "feat: desktop layout, email verify, wechat share, school groups, bug fixes"

echo [3/3] 推送到 GitHub...
git push -u origin main

echo.
echo 完成！按任意键关闭...
pause
