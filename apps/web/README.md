# 蓉小招：成都企业招聘入口聚合

这是蓉小招的第一版可运行网站。它以成都为范围，优先整理企业官网、企业专属招聘系统（ATS）和集团招聘入口，并保留来源类型、验证状态和最近验证日期。

## 当前数据范围

- 数据版本：V1.4
- 最近验证：2026-09-28
- 企业：244 家
- 官方有效招聘入口：79 个
- 职位样本：351 条，其中 108 条可直接前往职位详情

> 职位样本不代表企业全部在招岗位；投递前请以企业官网当前页面为准。

## 已实现页面

- `/`：网站用途、数据说明、职位样本与精选企业
- `/jobs`：关键词、职能、招聘类型和官方来源优先筛选
- `/jobs/[jobKey]`：职位来源、验证时间与跳转入口
- `/companies`：企业目录与来源状态筛选
- `/companies/[companyId]`：企业招聘入口、来源类型、验证状态和职位样本
- `/notebook`：本地收藏、最近浏览、投递状态与个人备注
- `/ops`：本地运营总览（版本、数据规模、复核待办，不公开）
- `/ops/review`：本地来源扫描审核台（不公开、不可写入）
- `/ops/review-queue`：本地企业复核排期台（不公开、不可写入）

## 来源标识规则

- **官方来源**：企业官网、企业专属 ATS、集团官方招聘入口或经确认的官方公告。
- **第三方线索**：第三方招聘平台中的线索，页面会明确标注，绝不显示成“官方直招”。
- **来源待核验**：尚没有足够证据确认来源归属，页面会提示待核验。

## 公开测试准备

公开测试前请在部署环境中设置：

```env
NEXT_PUBLIC_SITE_URL=https://你的公开地址
NEXT_PUBLIC_CONTACT_EMAIL=feedback@你的域名
OPS_USER=运营账号
OPS_PASSWORD=高强度随机密码
``` 

部署与首轮验收步骤见 [公开测试部署清单](../../docs/公开测试部署清单.md)。

## 本地运行

在本目录执行：

```powershell
pnpm dev
```

打开 `http://localhost:3000`。

质量检查：

```powershell
pnpm lint
pnpm build
```

## 数据更新

原始 CSV 文件位于：

```text
data/source/成都企业池_V1.4.csv
data/source/成都职位样本_V1.4.csv
```

网站读取的静态目录由下面命令生成并检查：

```powershell
pnpm data:verify:v14
```

不要直接编辑 `src/data/catalog.json`。完整字段、发布流程与来源复核机制见 [data/README.md](data/README.md)。
收到 WorkBuddy 的新一轮数据后，先不要直接覆盖现有目录。将数据放入 `data/incoming/V1.4`（或通过 `--input` 指定目录），先运行只读预检查：

```powershell
pnpm data:preflight -- --version=V1.4
# 外部目录示例
pnpm data:preflight -- --input="C:\path\to\V1.4" --version=V1.4
```

预检查会输出企业、职位的当前数量、疑似新增数量、重复项、缺失字段、无效链接和孤儿职位，并生成 `data/generated/data-preflight-V1.4.json`。只有错误为 0 时，才进入正式合并和 `pnpm data:verify:v14`。

导入器也支持按版本读取源文件，例如：

```powershell
pnpm data:import -- --version=V1.4
```

## 下一阶段

当前 V1.4 已完成保守合并：仅公开官方来源企业与地点已确认的职位；无法确认的内容保留在 data/incoming/V1.4，等待下一轮人工证据。

当前版本仍以静态目录为前台数据源。已具备第一个受限的公开来源扫描器；下一步将把人工复核后的变化引入后台工作流，并逐步建立职位快照、状态历史、采集运行日志与错误记录。ATS 来源优先做低频适配，其他来源继续保留人工复核流程。

## 公开来源扫描器

除了人工复核队列，项目现在包含第一个受限的官方公开来源扫描器。它用于产生「候选岗位变化」，而不是自动发布职位：

```powershell
pnpm source:scan:bytedance
```

允许扫描的目标位于 `data/source-adapters.json`。扫描器只向白名单中的官方域名发起单次低频请求；遇到登录、验证、访问限制、重定向或页面结构异常时，会停止并生成待人工复核报告。所有结果都保存到已忽略的 `data/generated/source-scans/`，不会改写 CSV 或前台目录。详细操作规则请见 `data/README.md`。


### 扫描后的人工审核

扫描结果会先变成一个本地审核队列，而不是自动出现在前台：

```powershell
pnpm source:review
```

审核人基于官方公开证据填写决定文件后，可运行：

```powershell
pnpm source:review:check
```

该命令只生成经过校验的动作预览；确认需要更新时，仍须人工修改 CSV 并运行 `pnpm data:verify:v14`。这一层设计避免把短暂页面变化或解析错误直接变成“岗位关闭”或公开职位。
### 本地审核台与维护预览

本地开发环境可打开 `http://localhost:3000/ops`（总览）或 `http://localhost:3000/ops/review`，用界面填写并导出 `decisions.json`。它没有账号或权限机制，**不得作为公开运营后台部署**；页面只能导出文件，不会保存、发布或改写数据。

审核决定经 `pnpm source:review:check` 校验后，可再生成一份只读的人工维护预览：

```powershell
pnpm source:maintenance:preview
```

预览保存到 `data/generated/source-reviews/maintenance-preview.json`，会列出可人工录入的 CSV 行草案、需比对的字段与禁止自动变更的事项。它绝不会写入 CSV、`catalog.json`、来源适配配置或网站前台。人工维护 CSV 后仍必须运行：

```powershell
pnpm data:verify:v14
pnpm lint
pnpm build
```

## 测试部署与上线检查

生产构建前建议执行完整发布检查：

```powershell
pnpm release:check
```

部署平台需要配置：

```text
NEXT_PUBLIC_SITE_URL=https://你的正式域名
```

部署后可检查以下地址：

- /api/health：返回当前数据版本、企业数、职位样本数与最近核验日期
- /robots.txt：确认站点地图地址和内部审核路径限制
- /sitemap.xml：确认企业与职位详情页已生成

> `/ops`、`/ops/review` 和 `/ops/review-queue` 已支持可选的 Basic Auth。公开部署前请在环境变量中设置 `OPS_USER` 和 `OPS_PASSWORD`；未设置时仅适合本地开发，不要直接把运营后台暴露到互联网。

