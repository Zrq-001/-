import { NextResponse } from "next/server";
import { catalogMeta } from "@/data/catalog";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "rong-xiao-zhao-web",
    version: catalogMeta.version,
    city: catalogMeta.city,
    companyCount: catalogMeta.companyCount,
    jobSampleCount: catalogMeta.jobSampleCount,
    verifiedAt: catalogMeta.verifiedAt,
  });
}
