const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fix() {
  const { data, error } = await supabase.from('banks').update({ country: 'Hollanda' }).is('country', null);
  console.log('Update null:', data, error);
  const { data2, error2 } = await supabase.from('banks').update({ country: 'Hollanda' }).eq('country', '');
  console.log('Update empty:', data2, error2);
}
fix();