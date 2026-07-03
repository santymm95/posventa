import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { resolveStaticDir } from "./vite";

describe("resolveStaticDir", () => {
  it("prefers the dist/public directory when it exists", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "posventa-static-"));
    const distPublicDir = path.join(tempRoot, "dist", "public");
    fs.mkdirSync(distPublicDir, { recursive: true });

    expect(resolveStaticDir(tempRoot)).toBe(distPublicDir);
  });

  it("falls back to the public directory when dist/public is missing", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "posventa-static-"));
    const publicDir = path.join(tempRoot, "public");
    fs.mkdirSync(publicDir, { recursive: true });

    expect(resolveStaticDir(tempRoot)).toBe(publicDir);
  });
});
