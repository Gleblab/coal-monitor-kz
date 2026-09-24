-- Рынок угля Казахстана: начальная схема PostgreSQL / Supabase
-- Не смешивает геологические ресурсы, балансовые запасы предприятий и статистический счет БНС.
-- Запись публично не открыта: anon/authenticated только чтение опубликованных проверенных строк.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Справочники
-- ---------------------------------------------------------------------------

CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  organization text NOT NULL,
  publication_title text NOT NULL,
  url text,
  source_type text NOT NULL,
  published_at date,
  retrieved_at date,
  notes text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sources_source_type_check CHECK (
    source_type IN ('official', 'company', 'regional')
  ),
  CONSTRAINT sources_url_check CHECK (url IS NULL OR url ~ '^https?://')
);

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'KZ',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  short_name text,
  company_type text,
  website text,
  notes text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_type_check CHECK (
    company_type IS NULL OR company_type IN ('too', 'ao', 'group', 'other')
  ),
  CONSTRAINT companies_website_check CHECK (website IS NULL OR website ~ '^https?://')
);

CREATE TABLE public.coal_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  asset_type text NOT NULL,
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  parent_asset_id uuid REFERENCES public.coal_assets (id) ON DELETE RESTRICT,
  operator_company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  coal_type text,
  description text,
  source_id uuid REFERENCES public.sources (id) ON DELETE RESTRICT,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coal_assets_type_check CHECK (
    asset_type IN ('basin', 'deposit', 'mine', 'enterprise')
  ),
  CONSTRAINT coal_assets_no_self_parent CHECK (parent_asset_id IS DISTINCT FROM id)
);

CREATE INDEX coal_assets_region_idx ON public.coal_assets (region_id);
CREATE INDEX coal_assets_operator_idx ON public.coal_assets (operator_company_id);
CREATE INDEX coal_assets_source_idx ON public.coal_assets (source_id);
CREATE INDEX coal_assets_parent_idx ON public.coal_assets (parent_asset_id);

-- ---------------------------------------------------------------------------
-- Показатели
-- ---------------------------------------------------------------------------

CREATE TABLE public.reserves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.coal_assets (id) ON DELETE RESTRICT,
  value numeric(18, 6) NOT NULL,
  unit text NOT NULL,
  reserve_type text NOT NULL,
  period_date date,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  methodology_note text,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reserves_value_check CHECK (value >= 0),
  CONSTRAINT reserves_type_check CHECK (
    reserve_type IN (
      'bns_statistical',
      'industry_estimate',
      'company_balance'
    )
  ),
  CONSTRAINT reserves_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  )
);

COMMENT ON COLUMN public.reserves.asset_id IS
  'NULL — общенациональный показатель. Не суммировать строки разных reserve_type.';
COMMENT ON COLUMN public.reserves.reserve_type IS
  'bns_statistical, industry_estimate и company_balance — разные методологии, не сопоставимы напрямую.';

CREATE INDEX reserves_asset_idx ON public.reserves (asset_id);
CREATE INDEX reserves_source_idx ON public.reserves (source_id);

CREATE TABLE public.production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.coal_assets (id) ON DELETE RESTRICT,
  company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  value numeric(18, 6) NOT NULL,
  unit text NOT NULL,
  period_start date,
  period_end date,
  period_type text,
  measure_kind text NOT NULL DEFAULT 'actual',
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  is_approximate boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_value_check CHECK (value >= 0),
  CONSTRAINT production_period_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),
  CONSTRAINT production_period_type_check CHECK (
    period_type IS NULL OR period_type IN ('year', 'quarter', 'month', 'plan_year', 'named_capacity')
  ),
  CONSTRAINT production_measure_kind_check CHECK (
    measure_kind IN ('actual', 'plan', 'capacity', 'expected')
  ),
  CONSTRAINT production_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  )
);

COMMENT ON COLUMN public.production.measure_kind IS
  'actual — факт добычи; plan — план; capacity — производственная мощность, не добыча.';

CREATE INDEX production_asset_idx ON public.production (asset_id);
CREATE INDEX production_company_idx ON public.production (company_id);
CREATE INDEX production_region_idx ON public.production (region_id);
CREATE INDEX production_source_idx ON public.production (source_id);

CREATE TABLE public.prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.coal_assets (id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  coal_product text,
  coal_type text,
  price numeric(18, 4) NOT NULL,
  price_max numeric(18, 4),
  currency text,
  unit text NOT NULL,
  market_level text,
  indicator_kind text NOT NULL DEFAULT 'level',
  period_start date,
  period_end date,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prices_price_check CHECK (price >= 0),
  CONSTRAINT prices_range_check CHECK (price_max IS NULL OR price_max >= price),
  CONSTRAINT prices_period_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),
  CONSTRAINT prices_indicator_kind_check CHECK (
    indicator_kind IN ('level', 'cumulative_growth')
  ),
  CONSTRAINT prices_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  ),
  CONSTRAINT prices_currency_for_level_check CHECK (
    indicator_kind <> 'level' OR currency IS NOT NULL
  )
);

COMMENT ON COLUMN public.prices.indicator_kind IS
  'level — цена за единицу; cumulative_growth — накопленный рост, не цена за тонну.';
COMMENT ON COLUMN public.prices.price_max IS
  'Верхняя граница интервала (если источник дал диапазон). Не усреднять с price.';

CREATE INDEX prices_region_idx ON public.prices (region_id);
CREATE INDEX prices_source_idx ON public.prices (source_id);

CREATE TABLE public.market_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_or_group text NOT NULL,
  market_segment text NOT NULL,
  share_percent numeric(7, 3) NOT NULL,
  year integer NOT NULL,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_shares_percent_check CHECK (
    share_percent >= 0 AND share_percent <= 100
  ),
  CONSTRAINT market_shares_year_check CHECK (year >= 1991 AND year <= 2100),
  CONSTRAINT market_shares_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  )
);

CREATE INDEX market_shares_source_idx ON public.market_shares (source_id);
CREATE INDEX market_shares_year_idx ON public.market_shares (year);

CREATE TABLE public.energy_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator text NOT NULL,
  value numeric(18, 6) NOT NULL,
  unit text NOT NULL,
  year integer NOT NULL,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT energy_balance_year_check CHECK (year >= 1991 AND year <= 2100),
  CONSTRAINT energy_balance_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  ),
  CONSTRAINT energy_balance_percent_check CHECK (
    unit <> '%' OR (value >= 0 AND value <= 100)
  )
);

CREATE INDEX energy_balance_source_idx ON public.energy_balance (source_id);
CREATE INDEX energy_balance_year_idx ON public.energy_balance (year);

CREATE TABLE public.trade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_type text NOT NULL,
  destination_country text,
  volume numeric(18, 6),
  volume_unit text,
  value_amount numeric(18, 4),
  currency text,
  period_start date,
  period_end date,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trade_type_check CHECK (
    trade_type IN ('export', 'import', 'domestic_supply')
  ),
  CONSTRAINT trade_volume_check CHECK (volume IS NULL OR volume >= 0),
  CONSTRAINT trade_has_measure_check CHECK (
    volume IS NOT NULL OR value_amount IS NOT NULL
  ),
  CONSTRAINT trade_period_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),
  CONSTRAINT trade_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  )
);

CREATE INDEX trade_source_idx ON public.trade (source_id);

-- Показатели, которые не являются запасами, добычей, ценой, долей, ТЭБ или внешней торговлей.
CREATE TABLE public.industry_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator text NOT NULL,
  value numeric(18, 6) NOT NULL,
  unit text NOT NULL,
  period_start date,
  period_end date,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  is_approximate boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT industry_indicators_value_check CHECK (value >= 0),
  CONSTRAINT industry_indicators_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  )
);

CREATE INDEX industry_indicators_source_idx ON public.industry_indicators (source_id);

CREATE TABLE public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.sources (id) ON DELETE RESTRICT,
  imported_at timestamptz NOT NULL DEFAULT now(),
  import_type text NOT NULL,
  status text NOT NULL,
  records_count integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_imports_type_check CHECK (
    import_type IN ('manual_seed', 'manual', 'api', 'file')
  ),
  CONSTRAINT data_imports_status_check CHECK (
    status IN ('completed', 'failed', 'partial')
  ),
  CONSTRAINT data_imports_count_check CHECK (
    records_count IS NULL OR records_count >= 0
  )
);

-- ---------------------------------------------------------------------------
-- Права: публично только SELECT. INSERT/UPDATE/DELETE для anon/authenticated нет.
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE
  public.sources,
  public.regions,
  public.companies,
  public.coal_assets,
  public.reserves,
  public.production,
  public.prices,
  public.market_shares,
  public.energy_balance,
  public.trade,
  public.industry_indicators,
  public.data_imports
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.sources,
  public.regions,
  public.companies,
  public.coal_assets,
  public.reserves,
  public.production,
  public.prices,
  public.market_shares,
  public.energy_balance,
  public.trade,
  public.industry_indicators
TO anon, authenticated;

-- data_imports: грантов SELECT для anon/authenticated нет.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coal_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY sources_public_read ON public.sources
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY regions_public_read ON public.regions
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY companies_public_read ON public.companies
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY coal_assets_public_read ON public.coal_assets
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY reserves_public_read ON public.reserves
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY production_public_read ON public.production
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY prices_public_read ON public.prices
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY market_shares_public_read ON public.market_shares
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY energy_balance_public_read ON public.energy_balance
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY trade_public_read ON public.trade
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY industry_indicators_public_read ON public.industry_indicators
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

-- Для INSERT/UPDATE/DELETE политик у anon и authenticated нет: при включённом RLS
-- это запрет записи. Админская запись — только service_role или SQL Editor.
-- data_imports: политик SELECT тоже нет, таблица для клиентских ролей закрыта.
CREATE POLICY data_imports_no_client_access ON public.data_imports
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
