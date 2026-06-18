import { createClient } from '@supabase/supabase-js';

// 直接硬编码，完全不使用环境变量
const supabaseUrl = 'https://cvqimeqsonvkqqxlwwya.supabase.co';
const supabaseAnonKey = 'sb_publishable_Mb8NCi1fv0h-w8W07m99aw_QeVwh5dC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// 导出配置供调试使用
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};
