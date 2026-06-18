import { createClient } from '@supabase/supabase-js';

// 直接硬编码，不用任何环境变量
const supabaseUrl = 'https://cvqimeqsonvkqqxlwwya.supabase.co';
const supabaseAnonKey = 'sb_publishable_Mb8NCi1fv0h-w8W07m99aw_QeVwh5dC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
