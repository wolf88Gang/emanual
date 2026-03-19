-- scripts/detect_profiles_duplicates.sql
-- PASO 1: DETECTAR duplicados antes de decidir y migrar
-- Ejecutar en Supabase SQL Editor para ver el estado actual.
--
-- En emanual: profiles.id = auth.users.id (1:1 por diseño).
-- Duplicados solo pueden existir si hubo migración fallida o datos importados.

-- Opción A: Si profiles tiene columna user_id (schema alternativo)
-- SELECT user_id, COUNT(*) as cnt, array_agg(id) as profile_ids
-- FROM profiles
-- GROUP BY user_id
-- HAVING COUNT(*) > 1;

-- Opción B: Para schema emanual (profiles.id = user id)
-- Duplicados por id son imposibles (PK). Revisar por email:
SELECT email, COUNT(*) AS cnt, array_agg(id::text) AS profile_ids
FROM public.profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- Si no devuelve filas → no hay duplicados, todo OK.
