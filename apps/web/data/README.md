# 数据导入与发布说明

网站目前仍是**静态目录 MVP**：页面读取 `src/data/catalog.json`，而它必须由 `data/source/` 中经过人工复核的 CSV 生成。这样每一条在网站上显示的企业和岗位，都能追溯回一份可审阅的源数据。

## 目录职责

```text
data/source/                         # 人工复核后的原始输入；提交前保留
  成都企业池_V1.3.csv
  成都职位样本_V1.3.csv
scripts/import-v12.mjs               # 将 CSV 转为前端使用的目录数据
scripts/validate-catalog.mjs         # 发布前的数据质量检查
src/data/catalog.json                # 自动生成，网站实际读取
```

> 不要直接手改 `src/data/catalog.json`。请修改源 CSV 后重新导入，避免网页内容和可追溯原始数据不一致。

## 每次更新的标准流程

在 `apps/web` 目录执行：

```powershell
pnpm data:verify
pnpm lint
pnpm build
```

`pnpm data:verify` 会依次：

1. 读取两份 CSV，生成 `src/data/catalog.json`；
2. 检查 CSV 表头、必填 ID、重复记录、企业—岗位关联、日期和 URL 格式；
3. 检查「官方有效」企业是否有可访问招聘入口（缺失时提示人工复核）、可直达职位是否有合法跳转链接；
4. 检查目录统计数与源数据是否一致。

带 `⚠` 的项目不会阻止发布，但必须人工复核；带 `✖` 的项目会阻止发布。

## 发布前人工核验清单

自动检查不能证明网页仍然有效，发布前仍需逐条抽查本次变化的记录：

- **来源真实性**：`official_source=true` 仅用于企业官网、专属 ATS、集团官方招聘入口或可证明的官方公告；第三方线索不得伪装成官方。
- **招聘状态**：只有当前页面能证明仍可查看职位/投递时，才用 `official_active`；无法确认时使用待核验或历史/关闭状态。
- **成都关联**：招聘页未明确工作地时，不要把岗位描述成确定的“成都岗位”；可使用“成都（推定）”并写入备注。
- **链接安全**：链接应以 `https://` 优先；不要写追踪短链、个人网盘或无法解释来源的聚合链接。
- **时间标记**：每次复核都更新验证日期；网站展示的是最近验证时间，不等同于职位发布时间。

## 当前版本边界

V1.3 只支持 CSV 重新导入，不会自动抓取或自动关闭岗位。后续接数据库后，源表会扩展为：招聘来源记录、采集运行日志、职位快照、状态历史和人工复核队列；其中 ATS 来源优先自动适配，其余来源默认进入人工复核。
## 数据健康报告

每次数据导入后，可以生成一份只读的维护提醒：

```powershell
pnpm data:health
# 需要复盘历史日期时：
pnpm data:health -- --as-of=2026-09-27
```

报告写入 `data/generated/data-health.json`，会列出验证逾期、即将到期、官方入口缺失、直达职位缺链接和缺验证日期的记录。它只是维护提示，**不等于职位关闭判断**，也不会改写 CSV 或前台目录。确认官方页面后，仍按人工复核流程修改源 CSV，再运行 `pnpm data:verify`。

## 招聘来源复核机制

网站现在会根据 `data/review-policy.json` 为每家企业生成一次**复核排期**。它不是自动爬虫，也不会自动把职位判定为关闭；它只帮助维护者决定“下一家应该先检查谁”。

```powershell
pnpm data:review
```

会生成本地报告：

```text
data/generated/review-queue.json
```

该文件是每次运行时生成的运营报告，不提交到仓库。需要按特定日期复现排期时可以执行：

```powershell
pnpm data:review -- --as-of 2026-09-26
```

当前复核策略：

| 来源类型 | 默认频率 | 处理方式 |
| --- | ---: | --- |
| 企业专属 ATS | 7 天 | 可评估自动适配，异常转人工 |
| 企业官网招聘页 | 14 天 | 可评估自动适配，异常转人工 |
| 集团招聘入口 | 14 天 | 可评估自动适配，需确认成都关联 |
| 官方微信招聘 | 7 天 | 人工优先 |
| 官方公告 | 21 天 | 人工优先，重点检查截止时间 |
| 第三方线索 / 搜索线索 / 待核验 | 30 天 | 人工优先，优先寻找官方替代来源 |

队列会将「没有验证日期」「官方有效但没有公开招聘链接」「超过复核日」排到高优先级。这里的 `automation_candidate` 只表示未来适合评估自动适配，**不代表当前网站已经自动抓取成功**。

## 官方公开来源扫描（候选变化检测）

`data/source-adapters.json` 是**允许扫描的官方公开来源白名单**。首个适配器目前只覆盖：

- `bytedance-campus-chengdu`（CD0040，字节跳动校园招聘成都关键词页）

运行一次低频扫描：

```powershell
pnpm source:scan:bytedance
```

扫描器只会对配置的官方域名发送 **1 次 GET 请求**，并设置 15 秒超时。它不会登录、翻页、提交表单、猜测未公开 API、绕过验证码或访问控制。扫描结果会被写到本地未提交的目录：

```text
data/generated/source-scans/bytedance-campus-chengdu/latest.json
data/generated/source-scans/bytedance-campus-chengdu/runs/
```

其中：

- `success`：读取到了明确的结构化岗位；生成的是**待复核的新增 / 变化候选**，不是自动发布结果；
- `manual_review_needed`：页面结构、跳转或内容不符合预期，停止解析并交给人工；
- `blocked`：出现登录、人机验证、访问限制或 HTTP 401 / 403 / 429；不会重试或绕过；
- `failed`：网络、超时或其他请求错误；脚本保留本次运行报告并以非零退出码结束。

特别注意：`notObservedThisScan` 的含义是「本次页面中没有观察到」，**绝不等于职位已经关闭**。任何结果都不能直接回写 `data/source/*.csv`；人工确认后再维护 CSV，并执行 `pnpm data:verify` 更新网站目录。



## 扫描结果的人工复核闭环

扫描报告不会直接改变数据。请使用以下流程：

```powershell
# 1. 先运行需要的低频扫描器，例如：
pnpm source:scan:bytedance

# 2. 把最新扫描结果整理成待审核队列和决定模板：
pnpm source:review
```

步骤 2 会生成以下本地、未提交文件：

```text
data/generated/source-reviews/pending.json
data/generated/source-reviews/decisions.template.json
```

- `pending.json`：当前待人工处理的来源健康问题、候选新增、候选变化或「本次未观察到」岗位；
- `decisions.template.json`：当前队列对应的可编辑决定模板，含 `queueFingerprint`，用于防止把旧决定应用到新队列。

审核时，把 `decisions.template.json` 复制为同目录的 `decisions.json`，填写审核人、决定、官方证据链接和判断说明。然后校验：

```powershell
pnpm source:review:check
```

校验通过后会生成：

```text
data/generated/source-reviews/approved-actions.json
```

它是**可追溯的人工决定与后续动作预览**，仍然不会自动编辑 CSV。只有当人工确认 `approve_for_data_entry` 后，才可以按数据维护流程编辑 `data/source/*.csv`，并运行：

```powershell
pnpm data:verify
```

`source:review:check` 会拒绝以下情况：队列版本过期、重复决定、不支持的决定类型、缺少审核说明，以及需要证据时未提供允许官方域名下的 HTTPS 链接。
### 审核后的维护预览（仍不写入数据）

审核决定校验通过后，可以生成一个只读的维护预览：

```powershell
pnpm source:maintenance:preview
```

该命令读取 `approved-actions.json` 和当前两份源 CSV，输出：

```text
data/generated/source-reviews/maintenance-preview.json
```

它只帮助人工判断哪些内容可作为**待录入草案**、哪些需要与当前 CSV 比对，以及哪些情况绝不能改成“岗位关闭”。预览中带有当前 CSV 的 SHA-256 快照；如果人工维护前 CSV 已变化，应重新生成预览。命令不会写入 CSV、`catalog.json`、`source-adapters.json` 或公开页面。

本地审核台入口是 `http://localhost:3000/ops/review`。这个页面没有身份认证，只能在本机开发环境使用；它导出的决定文件必须再经过 `pnpm source:review:check` 校验。
