import 'dotenv/config';
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function parseDatabaseUrl(databaseUrl: string): DatabaseConfig | null {
  if (!databaseUrl) return null;

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.protocol !== 'mysql:') {
      return null;
    }

    return {
      host: parsed.hostname || '127.0.0.1',
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: decodeURIComponent((parsed.pathname || '/').replace(/^\/+/, '') || 'asados_ventas'),
    };
  } catch {
    return null;
  }
}

export function getDatabaseConfig(): DatabaseConfig | null {
  const fromUrl = parseDatabaseUrl((process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim());
  if (fromUrl) {
    return fromUrl;
  }

  const host = (process.env.DB_HOST || '127.0.0.1').trim();
  const database = (process.env.DB_NAME || 'asados_ventas').trim();
  const user = (process.env.DB_USER || 'root').trim();
  const password = (process.env.DB_PASSWORD || '').trim();

  if (!host || !database || !user) {
    return null;
  }

  return {
    host,
    port: Number(process.env.DB_PORT || '3306'),
    user,
    password,
    database,
  };
}

export function hasDatabaseConfig(): boolean {
  return Boolean(getDatabaseConfig());
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    if (!config) {
      throw new Error('MySQL config is not available. Set DATABASE_URL or DB_HOST/DB_USER/DB_NAME.');
    }

    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }

  return pool;
}

function normalizeValue(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return value;
}

function buildQuery(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce((query, chunk, index) => {
    return query + chunk + (index < values.length ? '?' : '');
  }, '');
}

function getTableName(query: string): string | null {
  const match = query.match(/insert\s+into\s+`?([a-zA-Z0-9_]+)`?/i);
  return match?.[1] ?? null;
}

function parseReturningColumns(query: string): string | null {
  const match = query.trim().match(/\breturning\b\s+([a-zA-Z0-9_*]+)\s*$/i);
  return match?.[1] ?? null;
}

function normalizeRow<T>(row: unknown): T {
  if (!row || typeof row !== 'object') {
    return row as T;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    normalized[key.toLowerCase()] = value;
  }

  return normalized as T;
}

async function executeQuery(query: string, values: unknown[]) {
  const connection = getPool();
  const [rows] = await connection.execute(query, values.map(normalizeValue));

  if (Array.isArray(rows)) {
    return rows.map((row) => normalizeRow(row));
  }

  return rows;
}

async function handleReturning(query: string, values: unknown[]) {
  const trimmedQuery = query.trim();
  const returningColumns = parseReturningColumns(trimmedQuery);

  if (!returningColumns) {
    return [];
  }

  const noReturningClause = trimmedQuery.replace(/\s+returning\s+[a-zA-Z0-9_*]+\s*$/i, '').trim();
  const result = (await executeQuery(noReturningClause, values)) as ResultSetHeader;
  const insertId = result.insertId ?? 0;

  if (returningColumns === '*' || returningColumns.toLowerCase() === 'row') {
    const tableName = getTableName(noReturningClause);
    if (!tableName || !insertId) {
      return [];
    }

    const rows = (await executeQuery(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [insertId])) as RowDataPacket[];
    return rows;
  }

  if (returningColumns.toLowerCase() === 'id') {
    if (insertId) {
      return [{ id: insertId }];
    }

    const whereIdMatch = noReturningClause.match(/where\s+id\s*=\s*\?/i);
    if (whereIdMatch) {
      const idValue = values[values.length - 1];
      return [{ id: idValue }];
    }
  }

  return [];
}

export const sql: ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>) | null = hasDatabaseConfig()
  ? async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = buildQuery(strings, values).trim();

      if (/\breturning\b/i.test(query)) {
        return handleReturning(query, values);
      }

      const result = await executeQuery(query, values);
      if (Array.isArray(result)) {
        return result as any[];
      }

      return [];
    }
  : null;
