import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "./env";

describe("resolveDatabaseUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses DATABASE_URL when present", () => {
    process.env.DATABASE_URL = "postgresql://from-db";
    process.env.POSTGRES_URL = "postgresql://from-postgres";

    expect(resolveDatabaseUrl()).toBe("postgresql://from-db");
  });

  it("falls back to POSTGRES_URL for Neon/Vercel deployments", () => {
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_URL = "postgresql://from-postgres";

    expect(resolveDatabaseUrl()).toBe("postgresql://from-postgres");
  });
});
