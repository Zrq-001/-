# 蓉小招

成都企业招聘入口查询工具：优先整理企业官网、官方 ATS、集团招聘入口和可核验职位线索。

## 网站项目

```text
apps/web
```

技术栈：Next.js、React、TypeScript、Tailwind CSS。

## 本地运行

```powershell
cd apps/web
pnpm install
pnpm dev
```

## V1.4 发布检查

```powershell
cd apps/web
pnpm release:check:v14
```

## 部署到 Vercel

在 Vercel 导入本仓库，并将 **Root Directory** 设置为：

```text
apps/web
```

部署环境变量参考：

```env
NEXT_PUBLIC_SITE_URL=https://你的-vercel-地址
NEXT_PUBLIC_CONTACT_EMAIL=feedback@你的域名
OPS_USER=运营账号
OPS_PASSWORD=高强度随机密码
```

公开测试部署清单见：

```text
docs/公开测试部署清单.md
```

## 数据原则

蓉小招是招聘入口和职位线索索引，不是招聘方。投递前请以企业原始招聘页面为准。无法确认来源、地点或状态的数据不会自动发布到前台。
