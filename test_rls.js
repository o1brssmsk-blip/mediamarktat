const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function test() {
  const { data, error } = await supabase.from('sessions').insert([{
    ip_address: '127.0.0.1',
    user_agent: 'test',
    current_step: 'win'
  }]).select().single();
  
  if (error) {
    console.error('Insert error:', error);
    return;
  }
  
  console.log('Inserted:', data.id);
  
  const { error: updateError } = await supabase.from('sessions').update({ current_step: 'wait' }).eq('id', data.id);
  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Update success!');
  }
}
test();
