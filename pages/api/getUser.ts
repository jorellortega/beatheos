import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service key here (not public key)
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }

  console.log('[getUser] Incoming userId:', userId);
  const { data, error } = await supabaseAdmin
    .from('users') // Replace 'users' with your correct table name
    .select('*')   // Or only the fields you need
    .eq('id', userId)
    .maybeSingle();
  console.log('[getUser] Supabase response:', { data, error });

  if (error) {
    console.error('[getUser] Error details:', error);
    // Treat PGRST116 and 'row not found' as 'user not found'
    if (
      error.code === 'PGRST116' ||
      error.message.toLowerCase().includes('row not found')
    ) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
} 