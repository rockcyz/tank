# GitHub Pages 部署说明

## 部署步骤

### 1. 在 GitHub 上创建仓库

1. 登录 GitHub
2. 点击右上角的 "+" 号，选择 "New repository"
3. 输入仓库名称（例如：`scorpion-tank-commander`）
4. 选择 Public（GitHub Pages 免费版需要公开仓库）
5. **不要**初始化 README、.gitignore 或 license（我们已经有了）
6. 点击 "Create repository"

### 2. 配置仓库的 base 路径

**重要**：如果您的仓库名不是 `username.github.io`，需要修改 `vite.config.ts` 中的 base 路径。

打开 `vite.config.ts`，找到这一行：
```typescript
const base = process.env.GITHUB_REPOSITORY 
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/';
```

如果自动检测不工作，可以手动设置：
- 如果仓库名是 `username.github.io`，base 应该是 `'/'`
- 如果仓库名是其他名称（如 `scorpion-tank-commander`），base 应该是 `'/scorpion-tank-commander/'`

### 3. 连接本地仓库到 GitHub

```bash
# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 添加远程仓库（将 YOUR_USERNAME 和 REPO_NAME 替换为您的实际值）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 4. 启用 GitHub Pages

1. 在 GitHub 仓库页面，点击 "Settings"
2. 在左侧菜单中找到 "Pages"
3. 在 "Source" 部分，选择 "GitHub Actions"
4. 保存设置

### 5. 自动部署

配置完成后，每次您推送代码到 `main` 或 `master` 分支时，GitHub Actions 会自动：
- 安装依赖
- 构建项目
- 部署到 GitHub Pages

您可以在仓库的 "Actions" 标签页查看部署进度。

### 6. 访问您的网站

部署完成后，您的网站地址将是：
- 如果仓库名是 `username.github.io`：`https://username.github.io`
- 如果仓库名是其他名称：`https://username.github.io/仓库名/`

## 手动触发部署

如果需要手动触发部署，可以在 GitHub 仓库的 "Actions" 标签页中点击 "Deploy to GitHub Pages" 工作流，然后点击 "Run workflow"。

## 注意事项

1. **环境变量**：如果项目需要 API 密钥（如 GEMINI_API_KEY），需要在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加。
2. **首次部署**：首次部署可能需要几分钟时间。
3. **自定义域名**：可以在 GitHub Pages 设置中添加自定义域名。


