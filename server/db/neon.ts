import 'dotenv/config';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

const databaseUrl = (
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  ""
).trim();

export function hasNeonConfig(): boolean {
  return Boolean(databaseUrl);
}

export const sql: NeonQueryFunction<false, false> | null = hasNeonConfig()
  ? neon(databaseUrl)
  : null;
