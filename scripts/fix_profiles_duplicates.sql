-- scripts/fix_profiles_duplicates.sql
-- PASO 2: RESOLVER duplicados (semi-manual)
-- ⚠️ NO ejecutar automático. Revisar resultado de detect_profiles_duplicates.sql primero.
--
-- Estrategia: quedarse con el perfil más reciente (created_at desc).
-- Los demás se eliminan.
--
-- Requiere que profiles tenga columna user_id.
-- En emanual actual: profiles.id = auth.users.id (no hay user_id).
-- Adapta PARTITION BY según tu schema.

-- Descomenta para ejecutar (tras revisar detect_profiles_duplicates.sql):
/*
DELETE FROM public.profiles p
USING (
  SELECT id
  FROM (
    SELECT *,
           row_number() OVER (PARTITION BY id ORDER BY created_at DESC) AS rn
    FROM public.profiles
  ) t
  WHERE t.rn > 1
) d
WHERE p.id = d.id;
*/

-- Si tu schema tiene user_id: usa PARTITION BY user_id en lugar de id
