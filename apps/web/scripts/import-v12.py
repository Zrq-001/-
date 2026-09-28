"""Convert the reviewed WorkBuddy V1.3 CSV files into the website's static catalog."""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "source"
OUTPUT = ROOT / "src" / "data" / "catalog.json"


def text(value: str | None) -> str:
    return (value or "").strip()


def boolean(value: str | None) -> bool:
    return text(value).lower() in {"true", "是", "yes", "1"}


def integer(value: str | None) -> int | None:
    value = text(value)
    return int(value) if value.isdigit() else None


def read_csv(filename: str) -> list[dict[str, str]]:
    with (SOURCE / filename).open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


company_rows = read_csv("成都企业池_V1.3.csv")
job_rows = read_csv("成都职位样本_V1.3.csv")

companies = []
for row in company_rows:
    companies.append(
        {
            "id": text(row["company_id"]),
            "name": text(row["公司名称"]),
            "aliases": [item.strip() for item in text(row["公司别名"]).split("|") if item.strip()],
            "grade": text(row["企业等级"]),
            "industry": text(row["所属行业"]),
            "website": text(row["公司官网"]),
            "officeAddress": text(row["成都办公地点"]),
            "district": text(row["district"]),
            "careerUrl": text(row["招聘入口URL"]),
            "careerSourceName": text(row["招聘入口名称"]),
            "sourceType": text(row["source_type_label"]),
            "sourceTypeCode": text(row["source_type_code"]),
            "sourceTier": text(row["source_tier"]),
            "isOfficial": boolean(row["official_source"]),
            "hasChengduRoles": text(row["含成都岗位"]) == "是",
            "jobCount": integer(row["当前职位数量"]),
            "jobCountConfidence": text(row["job_count_confidence"]),
            "jobSampleCount": integer(row["职位样本数"]) or 0,
            "status": text(row["status_code"]),
            "statusLabel": text(row["status_label"]),
            "verificationLevel": text(row["verification_level"]),
            "verificationMethod": text(row["verification_method"]),
            "verifiedAt": text(row["最后验证日期"]),
            "evidenceUrl": text(row["证据链接"]),
            "notes": text(row["备注"]),
            "recordCategory": text(row["record_category"]),
        }
    )

jobs = []
for row in job_rows:
    jobs.append(
        {
            "key": text(row["job_key"]),
            "companyId": text(row["company_id"]),
            "companyName": text(row["公司名称"]),
            "grade": text(row["企业等级"]),
            "industry": text(row["所属行业"]),
            "title": text(row["职位名称"]),
            "location": text(row["location_text"]) or text(row["工作地"]),
            "district": text(row["district"]),
            "function": text(row["职能类别"]),
            "recruitmentType": text(row["招聘类型"]),
            "publishedAt": text(row["发布日期"]),
            "urlType": text(row["url_type"]),
            "isDirectDetail": text(row["is_direct_detail"]) == "是",
            "detailUrlConfidence": text(row["detail_url_confidence"]),
            "applyUrl": text(row["职位详情URL"]),
            "sourceUrl": text(row["来源招聘入口"]),
            "isOfficial": boolean(row["official_source"]),
            "verifiedAt": text(row["验证日期"]),
            "notes": text(row["备注"]),
        }
    )

catalog = {
    "meta": {
        "version": "V1.3",
        "city": "成都",
        "verifiedAt": max((company["verifiedAt"] for company in companies if company["verifiedAt"]), default=""),
        "companyCount": len(companies),
        "jobSampleCount": len(jobs),
        "officialActiveCompanyCount": sum(1 for company in companies if company["recordCategory"] == "official_active"),
        "directJobCount": sum(1 for job in jobs if job["isDirectDetail"]),
    },
    "companies": companies,
    "jobs": jobs,
}
OUTPUT.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {len(companies)} companies and {len(jobs)} jobs to {OUTPUT}")

