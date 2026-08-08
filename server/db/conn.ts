import 'dotenv/config';
import { sql as mysqlSql } from './mysql';
import { sql as neonSql } from './neon';

const databaseUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

export const sql = isPostgres ? neonSql : mysqlSql;
export const isPg = isPostgres;
