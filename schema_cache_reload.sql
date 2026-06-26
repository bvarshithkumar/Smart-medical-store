-- =====================================================================
-- SCHEMA CACHE RELOAD
-- Supabase PostgREST caches the schema at startup. After tables are
-- created with IF NOT EXISTS (e.g. notifications, chat_messages), you
-- must notify PostgREST to reload so the API can see them.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- =====================================================================

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the tables exist and have correct structure
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN ('notifications', 'chat_messages', 'prescriptions', 'pickup_reservations', 'profiles', 'cart_items')
ORDER BY table_name;
