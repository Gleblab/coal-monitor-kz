-- Этап 5: компании (добыча) и внешняя торговля HS 2701.
-- Не изменяет таблицы/constraint'ы этапов 1–4.1; только ADD COLUMN / новые CHECK.
-- Не смешивает production компаний с национальными рядами 90,2 / 115 / 128,9 / 113,0 / 120,0446.
-- trade.volume для HS 2701 — нетто-тонны, не «млн т».
-- Ministry 30 млн т остаётся отдельной строкой (methodology_scope = ministry_coal_exports).

-- ---------------------------------------------------------------------------
-- production: конфликт ревизий (Майкубен 3,8 vs 4,0) без удаления original.
-- ---------------------------------------------------------------------------

ALTER TABLE public.production
  ADD COLUMN IF NOT EXISTS series_role text;

ALTER TABLE public.production
  DROP CONSTRAINT IF EXISTS production_series_role_check;

ALTER TABLE public.production
  ADD CONSTRAINT production_series_role_check CHECK (
    series_role IS NULL OR series_role IN ('original', 'revised')
  );

COMMENT ON COLUMN public.production.series_role IS
  'original — первая официальная публикация за период; revised — позднейший официальный ряд. NULL — единственная/неконфликтная observation. Не выбирать молча одно значение при конфликте.';

-- ---------------------------------------------------------------------------
-- coal_assets: способ добычи (open pit) без выдуманных numeric rows.
-- ---------------------------------------------------------------------------

ALTER TABLE public.coal_assets
  ADD COLUMN IF NOT EXISTS mining_method text;

ALTER TABLE public.coal_assets
  DROP CONSTRAINT IF EXISTS coal_assets_mining_method_check;

ALTER TABLE public.coal_assets
  ADD CONSTRAINT coal_assets_mining_method_check CHECK (
    mining_method IS NULL OR mining_method IN ('open_pit', 'underground', 'mixed')
  );

COMMENT ON COLUMN public.coal_assets.mining_method IS
  'open_pit — открытая добыча. Не является numeric production.';

-- ---------------------------------------------------------------------------
-- trade: периоды, HS, YTD, партнёр vs конечный рынок.
-- ---------------------------------------------------------------------------

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS reporter text;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS hs_code text;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS flow text;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS measure_kind text;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS is_full_year boolean;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS declared_partner_may_be_transit boolean NOT NULL DEFAULT false;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS methodology_scope text;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS series_code text;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS partner_code text;

ALTER TABLE public.trade
  ADD COLUMN IF NOT EXISTS observation_scope text;

ALTER TABLE public.trade
  DROP CONSTRAINT IF EXISTS trade_flow_check;

ALTER TABLE public.trade
  ADD CONSTRAINT trade_flow_check CHECK (
    flow IS NULL OR flow IN ('export', 'import', 'domestic_supply')
  );

ALTER TABLE public.trade
  DROP CONSTRAINT IF EXISTS trade_measure_kind_check;

ALTER TABLE public.trade
  ADD CONSTRAINT trade_measure_kind_check CHECK (
    measure_kind IS NULL
    OR measure_kind IN ('actual', 'ytd_actual', 'plan', 'target', 'capacity')
  );

ALTER TABLE public.trade
  DROP CONSTRAINT IF EXISTS trade_observation_scope_check;

ALTER TABLE public.trade
  ADD CONSTRAINT trade_observation_scope_check CHECK (
    observation_scope IS NULL
    OR observation_scope IN ('national', 'partner')
  );

ALTER TABLE public.trade
  DROP CONSTRAINT IF EXISTS trade_methodology_scope_check;

ALTER TABLE public.trade
  ADD CONSTRAINT trade_methodology_scope_check CHECK (
    methodology_scope IS NULL
    OR methodology_scope IN (
      'ministry_coal_exports',
      'hs_2701_comtrade',
      'hs_2701_bns'
    )
  );

ALTER TABLE public.trade
  DROP CONSTRAINT IF EXISTS trade_flow_matches_type_check;

ALTER TABLE public.trade
  ADD CONSTRAINT trade_flow_matches_type_check CHECK (
    flow IS NULL OR flow = trade_type
  );

COMMENT ON COLUMN public.trade.hs_code IS
  'Код ТН ВЭД / HS. 2701 — каменный уголь. Не включать 2702/2703/2704 в этот ряд.';
COMMENT ON COLUMN public.trade.measure_kind IS
  'actual — полный период; ytd_actual — накопленный факт (например янв–июл). Не YoY между YTD и full year.';
COMMENT ON COLUMN public.trade.is_full_year IS
  'true — календарный год; false — неполный период. NULL у старых строк Минэнерго до заполнения seed этапа 5.';
COMMENT ON COLUMN public.trade.declared_partner_may_be_transit IS
  'true: декларируемая страна-партнёр может не отражать конечного потребителя. Это не доказанный транзит.';
COMMENT ON COLUMN public.trade.methodology_scope IS
  'ministry_coal_exports — формулировка Минэнерго (30 млн т 2025); hs_2701_comtrade — UN Comtrade reporter KZ HS 2701; hs_2701_bns — официальные таблицы БНС ТН ВЭД 2701. Не складывать и не подгонять.';
COMMENT ON COLUMN public.trade.volume IS
  'Для HS 2701 — нетто-тонны. Для ministry_coal_exports сохраняется единица исходной публикации (млн т).';

CREATE INDEX IF NOT EXISTS trade_hs_period_idx
  ON public.trade (hs_code, period_start, period_end);

CREATE INDEX IF NOT EXISTS trade_partner_idx
  ON public.trade (partner_code);

CREATE INDEX IF NOT EXISTS trade_series_idx
  ON public.trade (series_code);

CREATE INDEX IF NOT EXISTS production_series_role_idx
  ON public.production (series_role);
