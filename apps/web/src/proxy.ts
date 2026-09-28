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
  if (authorization?.startsWith("Basic ")) {
    try {
      const encoded = authorization.slice("Basic ".length);
      const decoded = atob(encoded);
      const separator = decoded.indexOf(":");
      if (separator >= 0 && decoded.slice(0, separator) === username && decoded.slice(separator + 1) === password) {
        return NextResponse.next();
      }
    } catch {
      // Treat malformed credentials as unauthorized instead of throwing a 500.
    }
  }

  return new NextResponse("需要运营访问权限。", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="蓉小招运营工具", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/ops/:path*"] };
