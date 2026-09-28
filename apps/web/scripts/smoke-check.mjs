const baseUrl = (process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || "3001"}`).replace(/\/$/, "");
const routes = ["/", "/jobs", "/companies", "/about", "/data-policy", "/api/health", "/robots.txt", "/sitemap.xml"];

let failed = false;
for (const route of routes) {
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "OK" : "FAIL"} ${response.status} ${route}`);
    failed ||= !ok;
  } catch (error) {
    console.error(`FAIL ${route} ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

if (failed) {
  console.error(`\nSmoke check failed. Is the production server running at ${baseUrl}?`);
  process.exit(1);
}
console.log(`\nSmoke check passed: ${routes.length} routes at ${baseUrl}`);
