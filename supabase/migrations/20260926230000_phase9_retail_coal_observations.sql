-- Phase 9A: розничные наблюдения по углю (акиматы / point prices).
-- Не изменяет public.prices. Не дублирует 19 500 / 18 800 / 16 800 в prices.
-- Не национальная средняя. Не markup. Не BNS monthly (отдельный extraction step).

CREATE TABLE public.retail_coal_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  locality text,
  seller text,
  coal_brand text NOT NULL,
  coal_variant text,
  price numeric,
  price_min numeric,
  price_max numeric,
  currency text NOT NULL DEFAULT 'KZT',
  unit text NOT NULL DEFAULT 't',
  stock_tonnes numeric,
  observation_date date,
  publication_date date,
  publication_url text,
  observation_type text NOT NULL,
  geographic_scope text NOT NULL,
  methodology_scope text,
  period_start date,
  period_end date,
  notes text,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retail_coal_price_nonneg_check CHECK (price IS NULL OR price >= 0),
  CONSTRAINT retail_coal_price_min_nonneg_check CHECK (price_min IS NULL OR price_min >= 0),
  CONSTRAINT retail_coal_price_max_nonneg_check CHECK (price_max IS NULL OR price_max >= 0),
  CONSTRAINT retail_coal_stock_nonneg_check CHECK (stock_tonnes IS NULL OR stock_tonnes >= 0),
  CONSTRAINT retail_coal_range_order_check CHECK (
    price_min IS NULL OR price_max IS NULL OR price_max >= price_min
  ),
  CONSTRAINT retail_coal_has_measure_check CHECK (
    price IS NOT NULL OR price_min IS NOT NULL OR price_max IS NOT NULL
  ),
  CONSTRAINT retail_coal_observation_type_check CHECK (
    observation_type IN (
      'average_city_price',
      'point_price',
      'regional_range',
      'official_statistical_price'
    )
  ),
  CONSTRAINT retail_coal_geographic_scope_check CHECK (
    geographic_scope IN ('city', 'district', 'region', 'national')
  ),
  CONSTRAINT retail_coal_period_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  )
);

COMMENT ON TABLE public.retail_coal_observations IS
  'Точечные и официальные розничные наблюдения по углю. Не смешивать с wholesale prices и не усреднять в национальную цену.';

COMMENT ON COLUMN public.retail_coal_observations.price IS
  'Точечная или средняя цена источника. NULL, если источник дал только диапазон. 0 не использовать как «нет данных».';

COMMENT ON COLUMN public.retail_coal_observations.publication_date IS
  'Календарная дата публикации страницы, только если подтверждена metadata источника. Иначе NULL.';

COMMENT ON COLUMN public.retail_coal_observations.publication_url IS
  'URL конкретной публикации. Не путать с sources.url (publisher/dataset).';

COMMENT ON COLUMN public.retail_coal_observations.period_start IS
  'Для статистического месяца (BNS): начало периода. Для акиматских snapshot обычно NULL.';

CREATE UNIQUE INDEX retail_coal_observations_natural_uidx
  ON public.retail_coal_observations (
    source_id,
    COALESCE(locality, ''),
    COALESCE(seller, ''),
    coal_brand,
    COALESCE(coal_variant, ''),
    COALESCE(publication_url, ''),
    COALESCE(observation_date, DATE '1900-01-01')
  );

CREATE INDEX retail_coal_observations_region_idx
  ON public.retail_coal_observations (region_id);

CREATE INDEX retail_coal_observations_source_idx
  ON public.retail_coal_observations (source_id);

CREATE INDEX retail_coal_observations_brand_idx
  ON public.retail_coal_observations (coal_brand);

REVOKE ALL ON TABLE public.retail_coal_observations
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.retail_coal_observations
TO anon, authenticated;

ALTER TABLE public.retail_coal_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY retail_coal_observations_public_read ON public.retail_coal_observations
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);
