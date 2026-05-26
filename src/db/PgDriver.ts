import { Pool, QueryResult } from 'pg';
import { PgConnection } from '../types/PgConnection';

export class PgDriver {
  private _pool: Pool | null = null;
  private _appName: string = 'prisma4postgres';

  constructor(
    private readonly _conn: PgConnection,
    private readonly _password: string,
    private readonly _statementTimeout: number = 30_000,
    appName?: string,
  ) {
    if (appName) this._appName = appName;
  }

  async connect(): Promise<void> {
    this._pool = new Pool({
      host: this._conn.host,
      port: this._conn.port,
      database: this._conn.database,
      user: this._conn.user,
      password: this._password,
      ssl: this._conn.ssl ? { rejectUnauthorized: false } : false,
      application_name: this._appName,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: this._statementTimeout,
    });
    const client = await this._pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    await this._pool?.end();
    this._pool = null;
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    if (!this._pool) throw new Error('Not connected');
    const result: QueryResult<T> = await this._pool.query<T>(sql, params as never[]);
    return result.rows;
  }

  async cancelActive(): Promise<void> {
    if (!this._pool) return;
    await this._pool.query(
      `SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE application_name = $1 AND state = 'active' AND pid <> pg_backend_pid()`,
      [this._appName]
    );
  }

  get isConnected(): boolean {
    return this._pool !== null;
  }
}

export async function testConnection(conn: PgConnection, password: string): Promise<void> {
  const driver = new PgDriver(conn, password);
  try {
    await driver.connect();
  } finally {
    await driver.disconnect();
  }
}
