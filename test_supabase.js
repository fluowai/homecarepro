import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('email_templates').select('id').limit(1).then(({ data, error }) => {
  console.log('Data:', data);
  console.log('Error:', error);
});
