import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: banks } = await supabase.from('banks').select('slug, name, country');
  console.log('Current banks:', banks.length);
  
  for (const b of banks) {
    if (b.slug.endsWith('-fi')) {
      console.log('Updating FI:', b.slug);
      await supabase.from('banks').update({ country: 'Finlandiya' }).eq('slug', b.slug);
    } else if (b.slug.endsWith('-es')) {
      console.log('Updating ES:', b.slug);
      await supabase.from('banks').update({ country: 'İspanya' }).eq('slug', b.slug);
    }
  }
  console.log('Done');
}
run();