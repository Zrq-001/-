import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const username = process.env.OPS_USER;
  const password = process.env.OPS_PASSWORD;

  // Local development remains frictionless. Set both variables before exposing the site publicly.
  if (!username || !password) return NextResponse.next();

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    const encoded = authorization.slice("Basic ".length);
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    if (separator >= 0 && decoded.slice(0, separator) === username && decoded.slice(separator + 1) === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("需要运营访问权限。", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="蓉小招运营工具", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/ops/:path*"] };

