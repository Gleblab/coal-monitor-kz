-- Этап 2 «Перспективы и развитие»: программы, показатели программ, генерация, углехимия.
-- Не пересоздаёт таблицы этапа 1. Не меняет существующие политики этапа 1.
-- Не исполняется из приложения.

-- ---------------------------------------------------------------------------
-- Справочник программ
-- ---------------------------------------------------------------------------

CREATE TABLE public.strategic_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  program_type text NOT NULL,
  status text NOT NULL,
  start_year integer NOT NULL,
  end_year integer NOT NULL,
  company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  methodology_note text,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategic_programs_years_check CHECK (start_year <= end_year),
  CONSTRAINT strategic_programs_year_range_check CHECK (
    start_year >= 1991 AND end_year <= 2100
  ),
  CONSTRAINT strategic_programs_type_check CHECK (
    program_type IN (
      'national_project',
      'company_strategy',
      'roadmap',
      'seasonal_plan'
    )
  ),
  CONSTRAINT strategic_programs_status_check CHECK (
    status IN ('approved', 'planned', 'roadmap', 'seasonal_plan')
  )
);

COMMENT ON TABLE public.strategic_programs IS
  'Утверждённые или объявленные программы развития. Не являются фактом добычи или установленной мощности.';
COMMENT ON COLUMN public.strategic_programs.status IS
  'approved — утверждённый план; planned — план/стратегия без усиления до «утверждено»; roadmap — дорожная карта; seasonal_plan — сезонный план.';

CREATE INDEX strategic_programs_source_idx ON public.strategic_programs (source_id);
CREATE INDEX strategic_programs_company_idx ON public.strategic_programs (company_id);

-- ---------------------------------------------------------------------------
-- Числовые показатели программ (с иерархией parent_indicator_id)
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.strategic_programs (id) ON DELETE RESTRICT,
  name text NOT NULL,
  value numeric(18, 6) NOT NULL,
  unit text NOT NULL,
  indicator_kind text NOT NULL,
  period_start date,
  period_end date,
  company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  parent_indicator_id uuid,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  status text NOT NULL,
  methodology_note text,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_indicators_value_check CHECK (value >= 0),
  CONSTRAINT program_indicators_period_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),
  CONSTRAINT program_indicators_kind_check CHECK (
    indicator_kind IN (
      'capacity',
      'count',
      'investment',
      'demand',
      'infrastructure',
      'other'
    )
  ),
  CONSTRAINT program_indicators_status_check CHECK (
    status IN ('official', 'industry', 'company', 'plan', 'regional')
  ),
  CONSTRAINT program_indicators_no_self_parent CHECK (
    parent_indicator_id IS DISTINCT FROM id
  ),
  CONSTRAINT program_indicators_program_id_unique UNIQUE (program_id, id),
  CONSTRAINT program_indicators_parent_same_program_fk
    FOREIGN KEY (program_id, parent_indicator_id)
    REFERENCES public.program_indicators (program_id, id)
    ON DELETE RESTRICT
);

COMMENT ON COLUMN public.program_indicators.parent_indicator_id IS
  'Дочерний показатель той же программы (например 49,4 ⊂ 95,5). Не сумма для вычисления родителя.';
COMMENT ON COLUMN public.program_indicators.indicator_kind IS
  'capacity — электрическая/иная мощность программы; count — число объектов; investment — инвестиции; demand — потребность; infrastructure — инфраструктура. Не путать capacity с production.measure_kind = capacity (мощность добычи).';

CREATE INDEX program_indicators_program_idx ON public.program_indicators (program_id);
CREATE INDEX program_indicators_source_idx ON public.program_indicators (source_id);
CREATE INDEX program_indicators_parent_idx ON public.program_indicators (parent_indicator_id);
CREATE INDEX program_indicators_company_idx ON public.program_indicators (company_id);
CREATE INDEX program_indicators_region_idx ON public.program_indicators (region_id);

-- ---------------------------------------------------------------------------
-- Объекты угольной генерации (не угольные активы добычи)
-- ---------------------------------------------------------------------------

CREATE TABLE public.generation_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.strategic_programs (id) ON DELETE RESTRICT,
  name text NOT NULL,
  project_type text NOT NULL,
  capacity_mw numeric(18, 3),
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  location_name text,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  status text NOT NULL,
  start_year integer,
  end_year integer,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_projects_type_check CHECK (
    project_type IN ('new_build', 'modernization')
  ),
  CONSTRAINT generation_projects_status_check CHECK (
    status IN ('planned', 'approved')
  ),
  CONSTRAINT generation_projects_capacity_check CHECK (
    capacity_mw IS NULL OR capacity_mw >= 0
  ),
  CONSTRAINT generation_projects_years_check CHECK (
    start_year IS NULL OR end_year IS NULL OR start_year <= end_year
  ),
  CONSTRAINT generation_projects_year_range_check CHECK (
    (start_year IS NULL OR (start_year >= 1991 AND start_year <= 2100))
    AND (end_year IS NULL OR (end_year >= 1991 AND end_year <= 2100))
  )
);

COMMENT ON TABLE public.generation_projects IS
  'Энергетические объекты нацпроекта. Нет FK на coal_assets: ГРЭС/КЭС не являются разрезами и бассейнами.';
COMMENT ON COLUMN public.generation_projects.region_id IS
  'NULL, если точный код региона в справочнике этапа 1 отсутствует. Тогда используется location_name.';

CREATE INDEX generation_projects_program_idx ON public.generation_projects (program_id);
CREATE INDEX generation_projects_source_idx ON public.generation_projects (source_id);
CREATE INDEX generation_projects_region_idx ON public.generation_projects (region_id);

-- ---------------------------------------------------------------------------
-- Качественные направления углехимии (без объёмов)
-- ---------------------------------------------------------------------------

CREATE TABLE public.chemistry_directions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.strategic_programs (id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chemistry_directions IS
  'Направления дорожной карты углехимии. Не количественный прогноз производства.';

CREATE INDEX chemistry_directions_program_idx ON public.chemistry_directions (program_id);
CREATE INDEX chemistry_directions_source_idx ON public.chemistry_directions (source_id);

-- ---------------------------------------------------------------------------
-- Текстовые меры программ (без обязательного числа)
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.strategic_programs (id) ON DELETE RESTRICT,
  company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  measure_type text NOT NULL,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_measures_type_check CHECK (
    measure_type IN ('technology', 'digital', 'equipment', 'contract', 'other')
  )
);

CREATE INDEX program_measures_program_idx ON public.program_measures (program_id);
CREATE INDEX program_measures_company_idx ON public.program_measures (company_id);
CREATE INDEX program_measures_source_idx ON public.program_measures (source_id);

-- ---------------------------------------------------------------------------
-- Права: публично только SELECT опубликованных проверенных строк.
-- Политики этапа 1 не изменяются.
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE
  public.strategic_programs,
  public.program_indicators,
  public.generation_projects,
  public.chemistry_directions,
  public.program_measures
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.strategic_programs,
  public.program_indicators,
  public.generation_projects,
  public.chemistry_directions,
  public.program_measures
TO anon, authenticated;

ALTER TABLE public.strategic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemistry_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_measures ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategic_programs_public_read ON public.strategic_programs
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY program_indicators_public_read ON public.program_indicators
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY generation_projects_public_read ON public.generation_projects
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY chemistry_directions_public_read ON public.chemistry_directions
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY program_measures_public_read ON public.program_measures
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);
