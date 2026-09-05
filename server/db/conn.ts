import 'dotenv/config';
import { sql as mysqlSql } from './mysql.js';
import { sql as neonSql } from './neon.js';

const databaseUrl = (
	process.env.DATABASE_URL ||
	process.env.POSTGRES_URL ||
	process.env.POSTGRES_PRISMA_URL ||
	process.env.POSTGRES_URL_NON_POOLING ||
	""
).trim();
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

export const sql = isPostgres
	? neonSql
	: databaseUrl || process.env.DB_HOST || process.env.DB_NAME || process.env.DB_USER
		? mysqlSql
		: null;
export const isPg = isPostgres;
