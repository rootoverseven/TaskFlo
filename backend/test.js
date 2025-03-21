import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { todosTable } from './db/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL + "?sslmode=require",
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(pool);

async function testConnection() {
  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    console.log('Database connection successful!');

    const result = await db.select().from(todosTable);
    console.log('Todos:', result);

    await client.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();