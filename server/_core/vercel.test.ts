import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Vercel routing", () => {
  it("routes non-API requests to the SPA entrypoint", () => {
    const vercelConfigPath = path.join(process.cwd(), "vercel.json");
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8"));
    const spaRoute = vercelConfig.rewrites?.find((route: { source?: string; destination?: string }) => route.source === "/(.*)");

    expect(spaRoute?.destination).toBe("/index.html");
  });
});
