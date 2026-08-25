import { Pool, PoolClient } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

export function getPostgresPool(): Pool {
  if (globalForPg.pgPool) {
    return globalForPg.pgPool;
  }

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("Falta POSTGRES_URL en .env.local");
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPg.pgPool = pool;
  }

  return pool;
}

// Función para queries simples
export async function queryPostgres(text: string, params: any[] = []) {
  const pool = getPostgresPool();
  return pool.query(text, params);
}

// Función para transacciones
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}