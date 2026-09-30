import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const username = process.env.OPS_USER;
  const password = process.env.OPS_PASSWORD;
  const isDeployed = Boolean(process.env.VERCEL_ENV);

  // Local development remains frictionless; deployed ops routes fail closed until credentials exist.
  if (isDeployed && (!username || !password)) {
    return new NextResponse("运营页面尚未配置访问权限。", { status: 503 });
  }
  if (!username || !password) return NextResponse.next();

  const authorization = request.headers.get("authorization");
  let expectedAuthorization = "";
  try {
    expectedAuthorization = `Basic ${btoa(`${username}:${password}`)}`;
  } catch {
    expectedAuthorization = "";
  }
  if (authorization && expectedAuthorization && authorization === expectedAuthorization) {
    return NextResponse.next();
  }

  return new NextResponse("需要运营访问权限。", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Rong Xiao Zhao Ops"' },
  });
}

export const config = { matcher: ["/ops/:path*"] };
