import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 验证环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing environment variables:", {
    url: supabaseUrl ? "set" : "missing",
    key: supabaseAnonKey ? "set" : "missing",
  });
}

console.log("[Supabase] Initializing with URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

// 测试连接
supabase.auth.onAuthStateChange((event, session) => {
  console.log("[Supabase] Auth state changed:", event, session?.user?.email);
});
