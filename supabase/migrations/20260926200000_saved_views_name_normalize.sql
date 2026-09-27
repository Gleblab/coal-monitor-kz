-- Saved Views: нормализация имени (whitespace collapse + case-insensitive unique).
-- Не изменяет 20260926190000_saved_views.sql и не трогает analytics/RLS.
-- Не DELETE и не UPDATE пользовательские названия.

CREATE FUNCTION public.normalize_saved_view_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'));
$$;

COMMENT ON FUNCTION public.normalize_saved_view_name(text) IS
  'Канонический ключ имени Saved View: btrim, схлопывание внутренней POSIX-последовательности whitespace в один U+0020, затем lower. Регистр stored name не меняет. Тире не нормализует.';

REVOKE ALL ON FUNCTION public.normalize_saved_view_name(text)
FROM PUBLIC, anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.saved_views
    GROUP BY user_id, public.normalize_saved_view_name(name)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'saved_views: после нормализации whitespace есть конфликтующие имена у одного пользователя. Новый unique index не создаём. Разрешите дубликаты вручную, строки не удалялись.';
  END IF;
END
$$;

CREATE UNIQUE INDEX saved_views_user_name_normalized_uidx
  ON public.saved_views (user_id, public.normalize_saved_view_name(name));

DROP INDEX IF EXISTS public.saved_views_user_name_uidx;
