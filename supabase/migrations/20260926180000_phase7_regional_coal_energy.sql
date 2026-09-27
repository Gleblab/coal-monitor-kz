-- Этап 7: независимые региональные наблюдения по углю (не ТЭБ БНС).
-- Не изменяет energy_balance / Phase 6. Не меняет существующие RLS.
-- household_coal_consumption — выборочное обследование БНС 2022 (кг).
-- power_coal_supply — фактическая реализация угля названному потребителю (млн т).
-- Показатели не суммируются и не являются региональным потреблением области.

CREATE TABLE public.regional_coal_energy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  year integer NOT NULL,
  metric_type text NOT NULL,
  consumer_name text,
  value numeric NOT NULL,
  unit text NOT NULL,
  official_label text,
  methodology_scope text NOT NULL,
  observation_scope text NOT NULL,
  measure_kind text NOT NULL,
  data_status text NOT NULL,
  is_derived boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regional_coal_energy_year_check CHECK (
    year >= 1991 AND year <= 2100
  ),
  CONSTRAINT regional_coal_energy_value_positive_check CHECK (value > 0),
  CONSTRAINT regional_coal_energy_metric_type_check CHECK (
    metric_type IN (
      'household_coal_consumption',
      'power_coal_supply'
    )
  ),
  CONSTRAINT regional_coal_energy_measure_kind_check CHECK (
    measure_kind IN (
      'total_volume',
      'average_per_household'
    )
  ),
  CONSTRAINT regional_coal_energy_scope_check CHECK (
    observation_scope IN (
      'national',
      'regional',
      'named_consumer'
    )
  ),
  CONSTRAINT regional_coal_energy_methodology_check CHECK (
    methodology_scope IN (
      'bns_household_fuel_survey_2022',
      'samruk_energy_consumer_coal_sales'
    )
  ),
  CONSTRAINT regional_coal_energy_status_check CHECK (
    data_status IN ('official', 'industry', 'company', 'plan', 'regional')
  ),
  CONSTRAINT regional_coal_energy_not_derived_check CHECK (is_derived = false),
  CONSTRAINT regional_coal_energy_avg_only_household_check CHECK (
    measure_kind <> 'average_per_household'
    OR metric_type = 'household_coal_consumption'
  ),
  CONSTRAINT regional_coal_energy_household_shape_check CHECK (
    metric_type <> 'household_coal_consumption'
    OR (
      consumer_name IS NULL
      AND unit = 'кг'
      AND data_status = 'official'
      AND methodology_scope = 'bns_household_fuel_survey_2022'
      AND observation_scope IN ('national', 'regional')
      AND measure_kind IN ('total_volume', 'average_per_household')
    )
  ),
  CONSTRAINT regional_coal_energy_power_shape_check CHECK (
    metric_type <> 'power_coal_supply'
    OR (
      consumer_name IS NOT NULL
      AND btrim(consumer_name) <> ''
      AND region_id IS NOT NULL
      AND unit = 'млн т'
      AND data_status = 'company'
      AND observation_scope = 'named_consumer'
      AND measure_kind = 'total_volume'
      AND methodology_scope = 'samruk_energy_consumer_coal_sales'
    )
  ),
  CONSTRAINT regional_coal_energy_metric_pair_check CHECK (
    (
      metric_type = 'household_coal_consumption'
      AND unit = 'кг'
      AND data_status = 'official'
      AND methodology_scope = 'bns_household_fuel_survey_2022'
    )
    OR (
      metric_type = 'power_coal_supply'
      AND unit = 'млн т'
      AND data_status = 'company'
      AND methodology_scope = 'samruk_energy_consumer_coal_sales'
    )
  ),
  CONSTRAINT regional_coal_energy_national_region_check CHECK (
    (observation_scope = 'national' AND region_id IS NULL)
    OR (observation_scope <> 'national' AND region_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.regional_coal_energy IS
  'Независимые наблюдения: потребление каменного угля домашними хозяйствами (обследование БНС 2022) и поставки угля названным энергопотребителям (Samruk-Energy). Не региональный ТЭБ. Не складывать metric_type. power_coal_supply — не потребление угля области.';

COMMENT ON COLUMN public.regional_coal_energy.metric_type IS
  'household_coal_consumption — каменный уголь домашних хозяйств; power_coal_supply — реализация угля конкретному потребителю/станции.';

COMMENT ON COLUMN public.regional_coal_energy.consumer_name IS
  'Официальное имя потребителя/станции из первоисточника. NULL для household. Не агрегировать несколько строк одной области в «потребление региона».';

COMMENT ON COLUMN public.regional_coal_energy.observation_scope IS
  'national — республиканский контрольный итог обследования (без фиктивного региона Kazakhstan); regional — ADM1; named_consumer — поставка названному предприятию.';

COMMENT ON COLUMN public.regional_coal_energy.measure_kind IS
  'total_volume — общий объём из первоисточника; average_per_household — среднее на одно домохозяйство (не на человека).';

COMMENT ON COLUMN public.regional_coal_energy.methodology_scope IS
  'bns_household_fuel_survey_2022 — выборочное обследование с распространением на генеральную совокупность; samruk_energy_consumer_coal_sales — фактическая реализация угля потребителям.';

COMMENT ON COLUMN public.regional_coal_energy.is_derived IS
  'CHECK is_derived = false: только официальная ячейка. Не интерполяция и не распределение национального итога.';

CREATE UNIQUE INDEX regional_coal_energy_observation_uidx
  ON public.regional_coal_energy (
    year,
    metric_type,
    measure_kind,
    observation_scope,
    COALESCE(region_id, '00000000-0000-4000-a000-000000000000'::uuid),
    COALESCE(consumer_name, '')
  );

CREATE INDEX regional_coal_energy_region_idx
  ON public.regional_coal_energy (region_id);

CREATE INDEX regional_coal_energy_source_idx
  ON public.regional_coal_energy (source_id);

CREATE INDEX regional_coal_energy_year_metric_idx
  ON public.regional_coal_energy (year, metric_type);

REVOKE ALL ON TABLE public.regional_coal_energy
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.regional_coal_energy
TO anon, authenticated;

ALTER TABLE public.regional_coal_energy ENABLE ROW LEVEL SECURITY;

CREATE POLICY regional_coal_energy_public_read ON public.regional_coal_energy
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);
