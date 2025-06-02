import { Pool } from 'pg';
import type { NextApiRequest, NextApiResponse } from 'next';

// Create a new pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'test_table'
      );
    `);

    // If table doesn't exist, create it
    if (!tableCheck.rows[0].exists) {
      await pool.query(`
        CREATE TABLE test_table (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL
        );
      `);

      // Insert a test name
      await pool.query(`
        INSERT INTO test_table (name) 
        VALUES ('Test Name 1'), ('Test Name 2');
      `);
    }

    // Get all names from the table
    const result = await pool.query('SELECT * FROM test_table ORDER BY id');
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 