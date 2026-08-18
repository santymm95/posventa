import 'dotenv/config';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

const databaseUrl = (process.env.DATABASE_URL || "").trim();

export function hasNeonConfig(): boolean {
  return Boolean(databaseUrl);
}

export const sql: NeonQueryFunction<false, false> | null = hasNeonConfig()
  ? neon(databaseUrl)
  : null;
