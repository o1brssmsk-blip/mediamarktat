'use server';

import { createClient } from '@supabase/supabase-js';

export async function deleteSessionsAction(ids: string[]) {
  if (!ids || ids.length === 0) return { success: false, error: 'No IDs provided' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return { success: false, error: 'Missing credentials' };

  const supabase = createClient(url, key);

  const { error } = await supabase.from('sessions').delete().in('id', ids);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
