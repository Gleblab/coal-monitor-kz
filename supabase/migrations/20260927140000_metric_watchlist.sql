-- Metric Watchlist: персональные ссылки на показатели, не snapshot KPI.
-- Не изменяет analytical tables, Saved Views и их RLS.

CREATE TABLE public.metric_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT metric_watchlist_key_not_blank_check CHECK (btrim(metric_key) <> ''),
  CONSTRAINT metric_watchlist_key_length_check CHECK (char_length(metric_key) <= 120),
  CONSTRAINT metric_watchlist_key_charset_check CHECK (metric_key ~ '^[A-Za-z0-9._:-]+$')
);

COMMENT ON TABLE public.metric_watchlist IS
  'Персональный список закреплённых показателей. Хранит стабильный metric_key, не копию value/title/source. Доступ только владельцу (authenticated).';

COMMENT ON COLUMN public.metric_watchlist.user_id IS
  'Владелец строки. Равен auth.uid() при клиентской записи. Неизменяем после INSERT.';

COMMENT ON COLUMN public.metric_watchlist.metric_key IS
  'Стабильный идентификатор показателя Metric Traceability, например production2025 или bnsIndustrial2025.';

CREATE UNIQUE INDEX metric_watchlist_user_key_uidx
  ON public.metric_watchlist (user_id, metric_key);

CREATE INDEX metric_watchlist_user_created_idx
  ON public.metric_watchlist (user_id, created_at DESC);

CREATE FUNCTION public.metric_watchlist_forbid_user_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'metric_watchlist.user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER metric_watchlist_forbid_user_id_change
  BEFORE UPDATE ON public.metric_watchlist
  FOR EACH ROW
  EXECUTE FUNCTION public.metric_watchlist_forbid_user_id_change();

REVOKE ALL ON FUNCTION public.metric_watchlist_forbid_user_id_change()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.metric_watchlist_forbid_user_id_change()
TO authenticated;

REVOKE ALL ON TABLE public.metric_watchlist
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.metric_watchlist
TO authenticated;

ALTER TABLE public.metric_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY metric_watchlist_select_own ON public.metric_watchlist
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY metric_watchlist_insert_own ON public.metric_watchlist
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY metric_watchlist_delete_own ON public.metric_watchlist
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
