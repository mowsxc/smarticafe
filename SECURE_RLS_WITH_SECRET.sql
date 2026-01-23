-- ========================================================
-- 安全增强版 RLS 配置 (基于自定义 Header 密钥)
-- ========================================================
-- 目的：防止 anon_key 泄露后数据库被公开全量访问。
-- 原理：要求所有同步请求必须带上只有 Tauri 应用知道的自定义 Header 'x-sync-secret'。
-- ========================================================

-- 1. 定义一个用于校验密钥的函数
CREATE OR REPLACE FUNCTION public.check_sync_secret()
RETURNS boolean AS $$
BEGIN
  -- 请在此处替换为您自己的强密钥（或通过环境变量注入）
  -- 只有当请求头包含正确的密钥时，才允许操作
  RETURN current_setting('request.headers', true)::json->>'x-sync-secret' = 'YOUR_SUPER_SECRET_KEY_HERE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 为所有表配置更严格的 RLS 策略
-- 以 shift_records 为例：

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.shift_records;

CREATE POLICY "Secure sync for shift_records" ON public.shift_records
  FOR ALL
  TO anon, authenticated
  USING (check_sync_secret())
  WITH CHECK (check_sync_secret());

-- 3. 您需要对其他表重复此操作 (products, orders, accounting_entries 等)
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all operations for anon" ON public.products;
-- CREATE POLICY "Secure sync for products" ON public.products FOR ALL TO anon USING (check_sync_secret()) WITH CHECK (check_sync_secret());

-- ========================================================
-- 前端调用修改建议 (services/supabase/client.ts):
-- ========================================================
-- 在 createClient 时，确保在 headers 中添加密钥：
/*
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'x-sync-secret': 'YOUR_SUPER_SECRET_KEY_HERE' },
  },
  // ...
});
*/
