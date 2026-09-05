import { Pool, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function query<T extends QueryResultRow = any>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}
