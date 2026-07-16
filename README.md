# PICK ONE · 选择困难决策机

支持加权轮盘、快速抽选和随机淘汰赛的静态决策网页，并通过“失望测试”帮助识别真实偏好。选项和历史记录只保存在当前浏览器。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 在 GitHub 新建一个空仓库。
2. 将项目推送到 `main` 分支。
3. 在仓库 **Settings → Pages** 中将 **Source** 设为 **GitHub Actions**。
4. 等待部署工作流完成。

工作流会自动识别仓库名并处理 GitHub Pages 子路径。

## 静态构建

```bash
npm run build:pages
```

静态文件会生成到 `out/`。
