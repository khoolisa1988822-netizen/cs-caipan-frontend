import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://cvqimeqsonvkqqxlwwya.supabase.co',
  'sb_publishable_Mb8NCi1fv0h-w8W07m99aw_QeVwh5dC',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
