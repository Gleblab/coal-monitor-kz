-- Этап 6: национальные сектора ТЭБ БНС 2025 в существующей energy_balance.
-- Не пересоздаёт таблицы этапов 1–5. Не меняет RLS.
-- Не изменяет строки 45,4% / 13,3% (headline indicators).
-- sector_code — сектора топливно-энергетического баланса БНС.
-- Не является market_shares.market_segment АЗРК (оптовая реализация угля).
-- Региональных energy observations в этом пакете нет.

ALTER TABLE public.energy_balance
  ALTER COLUMN value TYPE numeric;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS official_label text;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS dimension text;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS sector_code text;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS parent_sector_code text;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS observation_scope text;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS measure_kind text;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS is_derived boolean NOT NULL DEFAULT false;

ALTER TABLE public.energy_balance
  ADD COLUMN IF NOT EXISTS denominator_code text;

ALTER TABLE public.energy_balance
  DROP CONSTRAINT IF EXISTS energy_balance_dimension_check;

ALTER TABLE public.energy_balance
  ADD CONSTRAINT energy_balance_dimension_check CHECK (
    dimension IS NULL OR dimension IN (
      'headline',
      'final_total',
      'final_sector',
      'industry_subsector',
      'transport_subsector',
      'final_fuel'
    )
  );

ALTER TABLE public.energy_balance
  DROP CONSTRAINT IF EXISTS energy_balance_scope_check;

ALTER TABLE public.energy_balance
  ADD CONSTRAINT energy_balance_scope_check CHECK (
    observation_scope IS NULL OR observation_scope IN ('national')
  );

ALTER TABLE public.energy_balance
  DROP CONSTRAINT IF EXISTS energy_balance_measure_kind_check;

ALTER TABLE public.energy_balance
  ADD CONSTRAINT energy_balance_measure_kind_check CHECK (
    measure_kind IS NULL OR measure_kind IN ('volume', 'share')
  );

COMMENT ON TABLE public.energy_balance IS
  'Показатели ТЭБ БНС. Headline 45,4% / 13,3% — national shares. Сектора и виды топлива — national final consumption (1000 тнэ). dimension/sector_code не равны сегментам АЗРК. region_id нет: регионального ТЭБ в текущем наборе нет. is_derived = true только для явно посчитанных долей или суммы agri+fishing.';

COMMENT ON COLUMN public.energy_balance.dimension IS
  'headline — исходные KPI долей угля; final_sector — сектор конечного потребления; industry_subsector / transport_subsector — официальные строки ТЭБ; final_fuel — вид топлива в конечном потреблении. NULL у старых двух строк допустим.';

COMMENT ON COLUMN public.energy_balance.sector_code IS
  'Код сектора/топлива ТЭБ БНС (industry, residential, coal, …). Не код сегмента АЗРК (household, power, industrial).';

COMMENT ON COLUMN public.energy_balance.is_derived IS
  'false — значение из официальной ячейки/графы ТЭБ или официального агрегата граф той же строки. true — доля (объём/знаменатель×100) или сумма двух официальных строк.';

COMMENT ON COLUMN public.energy_balance.denominator_code IS
  'Для measure_kind = share: tfc_total — конечное потребление энергии; industry — сектор промышленности.';

CREATE UNIQUE INDEX IF NOT EXISTS energy_balance_phase6_slice_uidx
  ON public.energy_balance (year, dimension, sector_code, measure_kind)
  WHERE dimension IS NOT NULL AND sector_code IS NOT NULL AND measure_kind IS NOT NULL;
