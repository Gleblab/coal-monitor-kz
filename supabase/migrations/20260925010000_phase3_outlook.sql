-- Этап 3: семантика target / value_qualifier; start_year программ может быть неизвестен.
-- Не пересоздаёт таблицы этапов 1–2. Не меняет существующие RLS-политики.
-- Не исполняется из приложения.

-- ---------------------------------------------------------------------------
-- production.measure_kind: сохранить actual/plan/capacity/expected, добавить target.
-- ---------------------------------------------------------------------------

ALTER TABLE public.production
  DROP CONSTRAINT IF EXISTS production_measure_kind_check;

ALTER TABLE public.production
  ADD CONSTRAINT production_measure_kind_check CHECK (
    measure_kind IN ('actual', 'plan', 'capacity', 'expected', 'target')
  );

COMMENT ON COLUMN public.production.measure_kind IS
  'actual — факт добычи; plan — план периода; target — целевой показатель горизонта (не факт и не мощность); capacity — производственная мощность, не добыча; expected — ожидание.';

-- ---------------------------------------------------------------------------
-- program_indicators.value_qualifier: существующие строки = exact.
-- ---------------------------------------------------------------------------

ALTER TABLE public.program_indicators
  ADD COLUMN IF NOT EXISTS value_qualifier text NOT NULL DEFAULT 'exact';

ALTER TABLE public.program_indicators
  DROP CONSTRAINT IF EXISTS program_indicators_value_qualifier_check;

ALTER TABLE public.program_indicators
  ADD CONSTRAINT program_indicators_value_qualifier_check CHECK (
    value_qualifier IN ('exact', 'about', 'more_than', 'less_than')
  );

COMMENT ON COLUMN public.program_indicators.value_qualifier IS
  'exact — значение как в источнике; about — «около»; more_than — «более/свыше»; less_than — «менее». Не подставлять точное равенство для about/more_than.';

-- ---------------------------------------------------------------------------
-- strategic_programs.start_year: NULL, если источник указал только горизонт «до YYYY».
-- Существующие строки с заполненным start_year не меняются.
-- ---------------------------------------------------------------------------

ALTER TABLE public.strategic_programs
  ALTER COLUMN start_year DROP NOT NULL;

ALTER TABLE public.strategic_programs
  DROP CONSTRAINT IF EXISTS strategic_programs_years_check;

ALTER TABLE public.strategic_programs
  DROP CONSTRAINT IF EXISTS strategic_programs_year_range_check;

ALTER TABLE public.strategic_programs
  ADD CONSTRAINT strategic_programs_years_check CHECK (
    start_year IS NULL OR start_year <= end_year
  );

ALTER TABLE public.strategic_programs
  ADD CONSTRAINT strategic_programs_year_range_check CHECK (
    end_year >= 1991
    AND end_year <= 2100
    AND (
      start_year IS NULL
      OR (start_year >= 1991 AND start_year <= 2100)
    )
  );

-- ---------------------------------------------------------------------------
-- program_type: official_estimate — официальный ориентир, не второй national_project.
-- Нужен, чтобы UI, выбирающий program_type = national_project, не подменил нацпроект.
-- ---------------------------------------------------------------------------

ALTER TABLE public.strategic_programs
  DROP CONSTRAINT IF EXISTS strategic_programs_type_check;

ALTER TABLE public.strategic_programs
  ADD CONSTRAINT strategic_programs_type_check CHECK (
    program_type IN (
      'national_project',
      'company_strategy',
      'roadmap',
      'seasonal_plan',
      'official_estimate'
    )
  );

COMMENT ON COLUMN public.strategic_programs.program_type IS
  'national_project — утверждённый нацпроект; company_strategy — стратегия предприятия; roadmap — дорожная карта; seasonal_plan — сезонный план; official_estimate — официальный ориентир (не программа реализации).';
