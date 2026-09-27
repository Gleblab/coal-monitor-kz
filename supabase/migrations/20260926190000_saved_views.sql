-- Saved Views: персональное состояние UI (route + filters), не аналитические цифры.
-- Не изменяет Phase 1–7 analytics tables и их RLS.
-- Не создаёт seed: строки принадлежат конкретным auth.users.

CREATE TABLE public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  route text NOT NULL,
  region text NOT NULL,
  segment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_views_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT saved_views_name_length_check CHECK (char_length(name) <= 80),
  CONSTRAINT saved_views_route_not_blank_check CHECK (btrim(route) <> ''),
  CONSTRAINT saved_views_route_length_check CHECK (char_length(route) <= 120),
  CONSTRAINT saved_views_route_path_check CHECK (route LIKE '/%'),
  CONSTRAINT saved_views_route_no_space_check CHECK (route !~ '\s'),
  CONSTRAINT saved_views_region_not_blank_check CHECK (btrim(region) <> ''),
  CONSTRAINT saved_views_region_length_check CHECK (char_length(region) <= 64),
  CONSTRAINT saved_views_region_no_space_check CHECK (region !~ '\s'),
  CONSTRAINT saved_views_segment_not_blank_check CHECK (btrim(segment) <> ''),
  CONSTRAINT saved_views_segment_length_check CHECK (char_length(segment) <= 64),
  CONSTRAINT saved_views_segment_no_space_check CHECK (segment !~ '\s')
);

COMMENT ON TABLE public.saved_views IS
  'Персональные сохранённые представления дашборда: имя, маршрут и срез фильтров. Не хранит KPI и не является аналитическим наблюдением. Доступ только владельцу (authenticated).';

COMMENT ON COLUMN public.saved_views.user_id IS
  'Владелец представления. Равен auth.uid() при клиентской записи. Неизменяем после INSERT.';

COMMENT ON COLUMN public.saved_views.name IS
  'Отображаемое имя. Сравнение уникальности: lower(btrim(name)) в пределах user_id. Регистр оригинала сохраняется.';

COMMENT ON COLUMN public.saved_views.route IS
  'Pathname приложения, например /energy-role или /. Не URL источника и не query с KPI.';

COMMENT ON COLUMN public.saved_views.region IS
  'Код региона из FilterContext.snapshot().region, например pavlodar или all.';

COMMENT ON COLUMN public.saved_views.segment IS
  'Код сегмента/сектора из FilterContext.snapshot().segment, например industrial, all или industry.';

CREATE UNIQUE INDEX saved_views_user_name_uidx
  ON public.saved_views (user_id, lower(btrim(name)));

CREATE INDEX saved_views_user_updated_idx
  ON public.saved_views (user_id, updated_at DESC);

CREATE FUNCTION public.saved_views_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER saved_views_set_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.saved_views_set_updated_at();

CREATE FUNCTION public.saved_views_forbid_user_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'saved_views.user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER saved_views_forbid_user_id_change
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.saved_views_forbid_user_id_change();

REVOKE ALL ON FUNCTION public.saved_views_set_updated_at()
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.saved_views_forbid_user_id_change()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.saved_views_set_updated_at()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.saved_views_forbid_user_id_change()
TO authenticated;

REVOKE ALL ON TABLE public.saved_views
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_views
TO authenticated;

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_views_select_own ON public.saved_views
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY saved_views_insert_own ON public.saved_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_views_update_own ON public.saved_views
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_views_delete_own ON public.saved_views
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
