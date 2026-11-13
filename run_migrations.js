import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase env vars.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  try {
    const files = fs.readdirSync(migrationsDir)
                    .filter(f => f.endsWith('.sql'))
                    .sort(); // Dosya isimlerine göre sıralı çalışması önemli

    console.log(`Found ${files.length} migration files. Executing...`);

    for (const file of files) {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Executing ${file}...`);
      
      // REST API üzerinden doğrudan sorgu çalıştırılamıyor ancak pgcrypto 
      // veya benzeri RPC çağrılarıyla veya doğrudan veritabanı bağlantısıyla yapılabilir.
      // Not: Standart supabase-js client'ında raw SQL query fonksiyonu yoktur. 
      console.log('--- Note: @supabase/supabase-js cannot execute raw SQL directly. ---');
      break;
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

runMigrations();
