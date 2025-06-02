import { Pool } from 'pg';
import type { NextApiRequest, NextApiResponse } from 'next';

// Create a new pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5436'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: 'Name is required and must be a string' 
      });
    }

    // Trim the name and check if it's empty after trimming
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ 
        success: false,
        message: 'Name cannot be empty' 
      });
    }

    const result = await pool.query(
      'INSERT INTO test_table (name) VALUES ($1) RETURNING *',
      [trimmedName]
    );

    return res.status(200).json({
      success: true,
      message: 'Name added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to add name to database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 