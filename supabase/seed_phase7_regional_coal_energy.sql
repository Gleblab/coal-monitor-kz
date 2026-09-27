-- Этап 7: региональный энергетический профиль угля (household 2022 + power supply 2023–2025).
-- Не DELETE. Не изменяет energy_balance / 45,4% / 13,3%. Не ослабляет RLS.
-- Не запускается из приложения. Повторный запуск: ON CONFLICT (id) DO UPDATE.
-- Household: XLS БНС element 67696, листы 2.4 и 2.5 (публикация 5188). Единица — кг.
-- Power: таблица «Объем реализация угля потребителям, млн тонн», AR Samruk-Energy 2025.
-- Не складывать household и power. Не подписывать поставку ТЭЦ как потребление области.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'regional_coal_energy'
  ) THEN
    RAISE EXCEPTION 'Этап 7: нет public.regional_coal_energy. Сначала migration 20260926180000_phase7_regional_coal_energy.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.energy_balance
    WHERE id = '88888888-8888-4888-8888-888888888001' AND value = 45.4 AND unit = '%'
  ) THEN
    RAISE EXCEPTION 'Этап 7: не найдена неизменная строка 45,4%% (id …001).';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.energy_balance
    WHERE id = '88888888-8888-4888-8888-888888888002' AND value = 13.3 AND unit = '%'
  ) THEN
    RAISE EXCEPTION 'Этап 7: не найдена неизменная строка 13,3%% (id …002).';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE id = '11111111-1111-4111-8111-111111111022'
      AND code IS DISTINCT FROM 'bnsHouseholdFuelSurvey2022'
  ) THEN
    RAISE EXCEPTION 'Этап 7: UUID source …022 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE code = 'bnsHouseholdFuelSurvey2022'
      AND id IS DISTINCT FROM '11111111-1111-4111-8111-111111111022'
  ) THEN
    RAISE EXCEPTION 'Этап 7: code bnsHouseholdFuelSurvey2022 уже существует под другим UUID.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE url = 'https://stat.gov.kz/ru/industries/labor-and-income/stat-ags/publications/5188/'
      AND id IS DISTINCT FROM '11111111-1111-4111-8111-111111111022'
  ) THEN
    RAISE EXCEPTION 'Этап 7: URL публикации 5188 уже есть у другого source. Duplicate source не создаём.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE id = '11111111-1111-4111-8111-111111111023'
      AND code IS DISTINCT FROM 'samrukEnergyAr2025MarketReview'
  ) THEN
    RAISE EXCEPTION 'Этап 7: UUID source …023 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE code = 'samrukEnergyAr2025MarketReview'
      AND id IS DISTINCT FROM '11111111-1111-4111-8111-111111111023'
  ) THEN
    RAISE EXCEPTION 'Этап 7: code samrukEnergyAr2025MarketReview уже существует под другим UUID.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE url = 'https://ar2025.samruk-energy.kz/index/market-review.html'
      AND id IS DISTINCT FROM '11111111-1111-4111-8111-111111111023'
  ) THEN
    RAISE EXCEPTION 'Этап 7: URL Samruk-Energy market-review уже есть у другого source. Duplicate source не создаём.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.data_imports
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa18'
      AND import_type IS DISTINCT FROM 'manual_seed'
  ) THEN
    RAISE EXCEPTION 'Этап 7: UUID data_imports …aa18 занят другой записью.';
  END IF;
END $$;

INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES
  (
    '11111111-1111-4111-8111-111111111022',
    'bnsHouseholdFuelSurvey2022',
    'Бюро национальной статистики Республики Казахстан',
    'Потребление топлива и энергии в домашних хозяйствах в Республике Казахстан, 2022 год',
    'https://stat.gov.kz/ru/industries/labor-and-income/stat-ags/publications/5188/',
    'official',
    DATE '2023-06-30',
    DATE '2026-09-26',
    'Выборочное обследование 11 944 домашних хозяйств во всех областях, гг. Астана, Алматы и Шымкент; результаты распространены на генеральную совокупность. Не административный учёт 2025 и не ТЭБ. Числовые ячейки — электронная таблица element 67696, листы 2.4 (общий объём) и 2.5 (среднее на одно домохозяйство). «-» = явление отсутствует, не 0.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111023',
    'samrukEnergyAr2025MarketReview',
    'АО «Самрук-Энерго»',
    'Годовой отчёт 2025: обзор рынка электроэнергии и угля. Таблица «Объем реализация угля потребителям, млн тонн»',
    'https://ar2025.samruk-energy.kz/index/market-review.html',
    'company',
    NULL,
    DATE '2026-09-26',
    'Фактическая реализация угля названным потребителям за 2023–2025. Первая графа таблицы подписана «Область», но строки — конкретные предприятия/станции, не итог потребления области. Не ТЭБ БНС. Не сумма с обследованием домашних хозяйств 2022. Не URL годового отчёта Самрук-Қазына (sk.kz).',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  organization = EXCLUDED.organization,
  publication_title = EXCLUDED.publication_title,
  url = EXCLUDED.url,
  source_type = EXCLUDED.source_type,
  published_at = EXCLUDED.published_at,
  retrieved_at = EXCLUDED.retrieved_at,
  notes = EXCLUDED.notes,
  is_published = EXCLUDED.is_published;

-- public.regions: PK(id), UNIQUE(code). Не ON CONFLICT (id) DO UPDATE — иначе чужой code на том же UUID перезапишется.
-- Этапы 1/4/4.1 (…001–…007) не INSERT и не UPDATE.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('22222222-2222-4222-8222-222222222008'::uuid, 'akmola'),
        ('22222222-2222-4222-8222-222222222009', 'aktobe'),
        ('22222222-2222-4222-8222-222222222010', 'almaty'),
        ('22222222-2222-4222-8222-222222222011', 'west-kazakhstan'),
        ('22222222-2222-4222-8222-222222222012', 'jetisu'),
        ('22222222-2222-4222-8222-222222222013', 'kostanay'),
        ('22222222-2222-4222-8222-222222222014', 'kyzylorda'),
        ('22222222-2222-4222-8222-222222222015', 'north-kazakhstan'),
        ('22222222-2222-4222-8222-222222222016', 'turkistan'),
        ('22222222-2222-4222-8222-222222222017', 'almaty-city'),
        ('22222222-2222-4222-8222-222222222018', 'shymkent')
    ) AS v(id, code)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.regions r
      WHERE r.code = rec.code AND r.id IS DISTINCT FROM rec.id
    ) THEN
      RAISE EXCEPTION 'Этап 7: regions.code=% уже существует под другим UUID. Ничего не меняем.', rec.code;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.regions r
      WHERE r.id = rec.id AND r.code IS DISTINCT FROM rec.code
    ) THEN
      RAISE EXCEPTION 'Этап 7: UUID region % занят другим code. Ничего не меняем.', rec.id;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.regions (id, code, name, country, is_published) VALUES
  ('22222222-2222-4222-8222-222222222008', 'akmola', 'Акмолинская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222009', 'aktobe', 'Актюбинская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222010', 'almaty', 'Алматинская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222011', 'west-kazakhstan', 'Западно-Казахстанская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222012', 'jetisu', 'область Жетісу', 'KZ', true),
  ('22222222-2222-4222-8222-222222222013', 'kostanay', 'Костанайская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222014', 'kyzylorda', 'Кызылординская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222015', 'north-kazakhstan', 'Северо-Казахстанская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222016', 'turkistan', 'Туркестанская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222017', 'almaty-city', 'г. Алматы', 'KZ', true),
  ('22222222-2222-4222-8222-222222222018', 'shymkent', 'г. Шымкент', 'KZ', true)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  n_needed integer;
BEGIN
  SELECT COUNT(*) INTO n_needed
  FROM public.regions
  WHERE code IN (
    'pavlodar', 'karaganda', 'astana', 'abai', 'ulytau', 'zhambyl',
    'east-kazakhstan', 'akmola', 'aktobe', 'almaty', 'west-kazakhstan',
    'jetisu', 'kostanay', 'kyzylorda', 'north-kazakhstan', 'turkistan',
    'almaty-city', 'shymkent'
  );
  IF n_needed <> 18 THEN
    RAISE EXCEPTION 'Этап 7: ожидалось 18 ADM1-регионов с household-значениями, найдено %. Нужны этапы 1/4/4.1.', n_needed;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Semantic identity observations: UNIQUE index не ловит чужой id до INSERT.
-- Ключи без numeric values — значения ниже не дублируются и не меняются.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE phase7_obs_intent (
  id uuid PRIMARY KEY,
  year integer NOT NULL,
  metric_type text NOT NULL,
  measure_kind text NOT NULL,
  observation_scope text NOT NULL,
  region_code text,
  consumer_name text
) ON COMMIT DROP;

INSERT INTO phase7_obs_intent (
  id, year, metric_type, measure_kind, observation_scope, region_code, consumer_name
) VALUES
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70001', 2022, 'household_coal_consumption', 'total_volume', 'national', NULL, NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70002', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'abai', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70003', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'akmola', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70004', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'aktobe', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70005', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'almaty', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70006', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'west-kazakhstan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70007', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'zhambyl', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70008', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'jetisu', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70009', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'karaganda', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70010', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'kostanay', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70011', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'kyzylorda', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70012', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'pavlodar', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70013', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'north-kazakhstan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70014', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'turkistan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70015', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'ulytau', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70016', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'east-kazakhstan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70017', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'astana', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70018', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'almaty-city', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70019', 2022, 'household_coal_consumption', 'total_volume', 'regional', 'shymkent', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70020', 2022, 'household_coal_consumption', 'average_per_household', 'national', NULL, NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70021', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'abai', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70022', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'akmola', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70023', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'aktobe', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70024', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'almaty', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70025', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'west-kazakhstan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70026', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'zhambyl', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70027', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'jetisu', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70028', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'karaganda', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70029', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'kostanay', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70030', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'kyzylorda', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70031', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'pavlodar', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70032', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'north-kazakhstan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70033', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'turkistan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70034', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'ulytau', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70035', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'east-kazakhstan', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70036', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'astana', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70037', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'almaty-city', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70038', 2022, 'household_coal_consumption', 'average_per_household', 'regional', 'shymkent', NULL),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70039', 2023, 'power_coal_supply', 'total_volume', 'named_consumer', 'astana', 'АО «Астана-Энергия»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70040', 2024, 'power_coal_supply', 'total_volume', 'named_consumer', 'astana', 'АО «Астана-Энергия»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70041', 2025, 'power_coal_supply', 'total_volume', 'named_consumer', 'astana', 'АО «Астана-Энергия»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70042', 2023, 'power_coal_supply', 'total_volume', 'named_consumer', 'karaganda', 'ТОО «Караганда Энергоцентр»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70043', 2024, 'power_coal_supply', 'total_volume', 'named_consumer', 'karaganda', 'ТОО «Караганда Энергоцентр»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70044', 2025, 'power_coal_supply', 'total_volume', 'named_consumer', 'karaganda', 'ТОО «Караганда Энергоцентр»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70045', 2023, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'АО «Павлодарэнерго» ПТЭЦ-2, 3'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70046', 2024, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'АО «Павлодарэнерго» ПТЭЦ-2, 3'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70047', 2025, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'АО «Павлодарэнерго» ПТЭЦ-2, 3'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70048', 2023, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'ТОО «ЭГРЭС-1»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70049', 2024, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'ТОО «ЭГРЭС-1»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70050', 2025, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'ТОО «ЭГРЭС-1»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70051', 2023, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'АО «Станция ЭГРЭС-2»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70052', 2024, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'АО «Станция ЭГРЭС-2»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70053', 2025, 'power_coal_supply', 'total_volume', 'named_consumer', 'pavlodar', 'АО «Станция ЭГРЭС-2»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70054', 2023, 'power_coal_supply', 'total_volume', 'named_consumer', 'north-kazakhstan', 'АО «СевКазЭнерго»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70055', 2024, 'power_coal_supply', 'total_volume', 'named_consumer', 'north-kazakhstan', 'АО «СевКазЭнерго»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70056', 2025, 'power_coal_supply', 'total_volume', 'named_consumer', 'north-kazakhstan', 'АО «СевКазЭнерго»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70057', 2023, 'power_coal_supply', 'total_volume', 'named_consumer', 'akmola', 'ТОО «Степногорская ТЭЦ»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70058', 2024, 'power_coal_supply', 'total_volume', 'named_consumer', 'akmola', 'ТОО «Степногорская ТЭЦ»'),
  ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70059', 2025, 'power_coal_supply', 'total_volume', 'named_consumer', 'akmola', 'ТОО «Степногорская ТЭЦ»');

DO $$
DECLARE
  n_intent integer;
BEGIN
  SELECT COUNT(*) INTO n_intent FROM phase7_obs_intent;
  IF n_intent <> 59 THEN
    RAISE EXCEPTION 'Этап 7: phase7_obs_intent должен содержать 59 ключей, найдено %.', n_intent;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM phase7_obs_intent i
    LEFT JOIN public.regions r ON r.code = i.region_code
    JOIN public.regional_coal_energy e
      ON e.year = i.year
     AND e.metric_type = i.metric_type
     AND e.measure_kind = i.measure_kind
     AND e.observation_scope = i.observation_scope
     AND COALESCE(e.region_id, '00000000-0000-4000-a000-000000000000'::uuid)
       = COALESCE(r.id, '00000000-0000-4000-a000-000000000000'::uuid)
     AND COALESCE(e.consumer_name, '') = COALESCE(i.consumer_name, '')
    WHERE e.id IS DISTINCT FROM i.id
  ) THEN
    RAISE EXCEPTION 'Этап 7: semantic observation уже существует под другим id. Duplicate не создаём.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.regional_coal_energy e
    JOIN phase7_obs_intent i ON i.id = e.id
    LEFT JOIN public.regions r ON r.code = i.region_code
    WHERE e.year IS DISTINCT FROM i.year
       OR e.metric_type IS DISTINCT FROM i.metric_type
       OR e.measure_kind IS DISTINCT FROM i.measure_kind
       OR e.observation_scope IS DISTINCT FROM i.observation_scope
       OR COALESCE(e.region_id, '00000000-0000-4000-a000-000000000000'::uuid)
          IS DISTINCT FROM COALESCE(r.id, '00000000-0000-4000-a000-000000000000'::uuid)
       OR COALESCE(e.consumer_name, '') IS DISTINCT FROM COALESCE(i.consumer_name, '')
  ) THEN
    RAISE EXCEPTION 'Этап 7: UUID observation занят другой semantic-записью. Ничего не перезаписываем.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Household total volume, лист 2.4, уголь каменный, кг.
-- National — контрольный итог, region_id NULL (не фиктивный ADM1 Kazakhstan).
-- Атырауская и Мангистауская: «-» (явление отсутствует) — строк нет.
-- ---------------------------------------------------------------------------

INSERT INTO public.regional_coal_energy (
  id, region_id, source_id, year, metric_type, consumer_name, value, unit,
  official_label, methodology_scope, observation_scope, measure_kind,
  data_status, is_derived, is_verified, is_published, notes
)
SELECT
  v.id,
  r.id,
  '11111111-1111-4111-8111-111111111022'::uuid,
  2022,
  'household_coal_consumption',
  NULL,
  v.value_kg,
  'кг',
  'Уголь каменный, кг',
  'bns_household_fuel_survey_2022',
  v.observation_scope,
  'total_volume',
  'official',
  false,
  true,
  true,
  v.notes
FROM (
  VALUES
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70001'::uuid,
      NULL,
      'national'::text,
      7312097906::numeric,
      'Лист 2.4, строка «Республика Казахстан». Контрольный итог 7 312 097 906 кг (округлённо 7,312 млн т). Не регион ADM1.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70002',
      'abai',
      'regional',
      1277371768,
      'Лист 2.4, строка «Абай». 1 277 371 768 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70003',
      'akmola',
      'regional',
      471805367,
      'Лист 2.4, строка «Акмолинская». 471 805 367 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70004',
      'aktobe',
      'regional',
      50567925,
      'Лист 2.4, строка «Актюбинская». 50 567 925 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70005',
      'almaty',
      'regional',
      114118611,
      'Лист 2.4, строка «Алматинская». 114 118 611 кг. Не г. Алматы.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70006',
      'west-kazakhstan',
      'regional',
      7960331,
      'Лист 2.4, строка «Западно-Казахстанская». 7 960 331 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70007',
      'zhambyl',
      'regional',
      9699842,
      'Лист 2.4, строка «Жамбылская». 9 699 842 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70008',
      'jetisu',
      'regional',
      81470208,
      'Лист 2.4, строка «Жетісу». 81 470 208 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70009',
      'karaganda',
      'regional',
      2606398148,
      'Лист 2.4, строка «Карагандинская». 2 606 398 148 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70010',
      'kostanay',
      'regional',
      254108406,
      'Лист 2.4, строка «Костанайская». 254 108 406 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70011',
      'kyzylorda',
      'regional',
      62084884,
      'Лист 2.4, строка «Кызылординская». 62 084 884 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70012',
      'pavlodar',
      'regional',
      277534983,
      'Лист 2.4, строка «Павлодарская». 277 534 983 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70013',
      'north-kazakhstan',
      'regional',
      341110544,
      'Лист 2.4, строка «Северо-Казахстанская». 341 110 544 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70014',
      'turkistan',
      'regional',
      35988752,
      'Лист 2.4, строка «Туркестанская». 35 988 752 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70015',
      'ulytau',
      'regional',
      101309790,
      'Лист 2.4, строка «Ұлытау». 101 309 790 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70016',
      'east-kazakhstan',
      'regional',
      1578552422,
      'Лист 2.4, строка «Восточно-Казахстанская». 1 578 552 422 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70017',
      'astana',
      'regional',
      39020612,
      'Лист 2.4, строка «г. Астана». 39 020 612 кг.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70018',
      'almaty-city',
      'regional',
      200685,
      'Лист 2.4, строка «г. Алматы». 200 685 кг. Не Алматинская область.'
    ),
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70019',
      'shymkent',
      'regional',
      2794629,
      'Лист 2.4, строка «г. Шымкент». 2 794 629 кг.'
    )
) AS v(id, region_code, observation_scope, value_kg, notes)
LEFT JOIN public.regions r ON r.code = v.region_code
ON CONFLICT (id) DO UPDATE SET
  region_id = EXCLUDED.region_id,
  source_id = EXCLUDED.source_id,
  year = EXCLUDED.year,
  metric_type = EXCLUDED.metric_type,
  consumer_name = EXCLUDED.consumer_name,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  official_label = EXCLUDED.official_label,
  methodology_scope = EXCLUDED.methodology_scope,
  observation_scope = EXCLUDED.observation_scope,
  measure_kind = EXCLUDED.measure_kind,
  data_status = EXCLUDED.data_status,
  is_derived = EXCLUDED.is_derived,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Household average per household, лист 2.5, уголь каменный, кг.
-- Официальный знаменатель: «на одно домохозяйство в среднем за год». Не «на человека».
-- ---------------------------------------------------------------------------

INSERT INTO public.regional_coal_energy (
  id, region_id, source_id, year, metric_type, consumer_name, value, unit,
  official_label, methodology_scope, observation_scope, measure_kind,
  data_status, is_derived, is_verified, is_published, notes
)
SELECT
  v.id,
  r.id,
  '11111111-1111-4111-8111-111111111022'::uuid,
  2022,
  'household_coal_consumption',
  NULL,
  v.value_kg,
  'кг',
  'Потребление каменного угля на одно домохозяйство в среднем за год, кг',
  'bns_household_fuel_survey_2022',
  v.observation_scope,
  'average_per_household',
  'official',
  false,
  true,
  true,
  v.notes
FROM (
  VALUES
    (
      'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70020'::uuid,
      NULL,
      'national'::text,
      6849::numeric,
      'Лист 2.5, строка «Республика Казахстан». 6 849 кг на одно домохозяйство. Не на человека.'
    ),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70021', 'abai', 'regional', 6704, 'Лист 2.5, «Абай». 6 704 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70022', 'akmola', 'regional', 6745, 'Лист 2.5, «Акмолинская». 6 745 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70023', 'aktobe', 'regional', 9365, 'Лист 2.5, «Актюбинская». 9 365 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70024', 'almaty', 'regional', 8126, 'Лист 2.5, «Алматинская». 8 126 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70025', 'west-kazakhstan', 'regional', 8625, 'Лист 2.5, «Западно-Казахстанская». 8 625 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70026', 'zhambyl', 'regional', 8793, 'Лист 2.5, «Жамбылская». 8 793 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70027', 'jetisu', 'regional', 7862, 'Лист 2.5, «Жетісу». 7 862 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70028', 'karaganda', 'regional', 6864, 'Лист 2.5, «Карагандинская». 6 864 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70029', 'kostanay', 'regional', 8081, 'Лист 2.5, «Костанайская». 8 081 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70030', 'kyzylorda', 'regional', 7670, 'Лист 2.5, «Кызылординская». 7 670 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70031', 'pavlodar', 'regional', 8064, 'Лист 2.5, «Павлодарская». 8 064 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70032', 'north-kazakhstan', 'regional', 8810, 'Лист 2.5, «Северо-Казахстанская». 8 810 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70033', 'turkistan', 'regional', 7983, 'Лист 2.5, «Туркестанская». 7 983 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70034', 'ulytau', 'regional', 9014, 'Лист 2.5, «Ұлытау». 9 014 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70035', 'east-kazakhstan', 'regional', 6024, 'Лист 2.5, «Восточно-Казахстанская». 6 024 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70036', 'astana', 'regional', 8384, 'Лист 2.5, «г. Астана». 8 384 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70037', 'almaty-city', 'regional', 7420, 'Лист 2.5, «г. Алматы». 7 420 кг на одно домохозяйство.'),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70038', 'shymkent', 'regional', 7000, 'Лист 2.5, «г. Шымкент». 7 000 кг на одно домохозяйство.')
) AS v(id, region_code, observation_scope, value_kg, notes)
LEFT JOIN public.regions r ON r.code = v.region_code
ON CONFLICT (id) DO UPDATE SET
  region_id = EXCLUDED.region_id,
  source_id = EXCLUDED.source_id,
  year = EXCLUDED.year,
  metric_type = EXCLUDED.metric_type,
  consumer_name = EXCLUDED.consumer_name,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  official_label = EXCLUDED.official_label,
  methodology_scope = EXCLUDED.methodology_scope,
  observation_scope = EXCLUDED.observation_scope,
  measure_kind = EXCLUDED.measure_kind,
  data_status = EXCLUDED.data_status,
  is_derived = EXCLUDED.is_derived,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Power coal supply to named consumers, 2023–2025, млн т.
-- Не сумма по Павлодарской области. Не региональное потребление.
-- ---------------------------------------------------------------------------

INSERT INTO public.regional_coal_energy (
  id, region_id, source_id, year, metric_type, consumer_name, value, unit,
  official_label, methodology_scope, observation_scope, measure_kind,
  data_status, is_derived, is_verified, is_published, notes
)
SELECT
  v.id,
  r.id,
  '11111111-1111-4111-8111-111111111023'::uuid,
  v.year,
  'power_coal_supply',
  v.consumer_name,
  v.value_mt,
  'млн т',
  'Объем реализация угля потребителям, млн тонн',
  'samruk_energy_consumer_coal_sales',
  'named_consumer',
  'total_volume',
  'company',
  false,
  true,
  true,
  'Фактическая реализация угля названному потребителю. Не потребление угля региона и не сумма с обследованием домашних хозяйств БНС 2022. Строка таблицы источника, не графа «Область» как итог области.'
FROM (
  VALUES
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70039'::uuid, 'astana', 2023, 'АО «Астана-Энергия»'::text, 3.65::numeric),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70040', 'astana', 2024, 'АО «Астана-Энергия»', 3.63),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70041', 'astana', 2025, 'АО «Астана-Энергия»', 3.66),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70042', 'karaganda', 2023, 'ТОО «Караганда Энергоцентр»', 2.56),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70043', 'karaganda', 2024, 'ТОО «Караганда Энергоцентр»', 2.57),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70044', 'karaganda', 2025, 'ТОО «Караганда Энергоцентр»', 2.19),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70045', 'pavlodar', 2023, 'АО «Павлодарэнерго» ПТЭЦ-2, 3', 2.90),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70046', 'pavlodar', 2024, 'АО «Павлодарэнерго» ПТЭЦ-2, 3', 3.07),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70047', 'pavlodar', 2025, 'АО «Павлодарэнерго» ПТЭЦ-2, 3', 3.02),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70048', 'pavlodar', 2023, 'ТОО «ЭГРЭС-1»', 13.39),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70049', 'pavlodar', 2024, 'ТОО «ЭГРЭС-1»', 13.28),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70050', 'pavlodar', 2025, 'ТОО «ЭГРЭС-1»', 14.79),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70051', 'pavlodar', 2023, 'АО «Станция ЭГРЭС-2»', 3.59),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70052', 'pavlodar', 2024, 'АО «Станция ЭГРЭС-2»', 3.65),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70053', 'pavlodar', 2025, 'АО «Станция ЭГРЭС-2»', 3.60),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70054', 'north-kazakhstan', 2023, 'АО «СевКазЭнерго»', 2.11),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70055', 'north-kazakhstan', 2024, 'АО «СевКазЭнерго»', 2.17),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70056', 'north-kazakhstan', 2025, 'АО «СевКазЭнерго»', 2.33),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70057', 'akmola', 2023, 'ТОО «Степногорская ТЭЦ»', 0.71),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70058', 'akmola', 2024, 'ТОО «Степногорская ТЭЦ»', 0.70),
    ('e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70059', 'akmola', 2025, 'ТОО «Степногорская ТЭЦ»', 0.81)
) AS v(id, region_code, year, consumer_name, value_mt)
JOIN public.regions r ON r.code = v.region_code
ON CONFLICT (id) DO UPDATE SET
  region_id = EXCLUDED.region_id,
  source_id = EXCLUDED.source_id,
  year = EXCLUDED.year,
  metric_type = EXCLUDED.metric_type,
  consumer_name = EXCLUDED.consumer_name,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  official_label = EXCLUDED.official_label,
  methodology_scope = EXCLUDED.methodology_scope,
  observation_scope = EXCLUDED.observation_scope,
  measure_kind = EXCLUDED.measure_kind,
  data_status = EXCLUDED.data_status,
  is_derived = EXCLUDED.is_derived,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes;

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa18',
  '11111111-1111-4111-8111-111111111022',
  TIMESTAMPTZ '2026-09-26 00:00:00+00',
  'manual_seed',
  'completed',
  59,
  'Этап 7. 59 observations: household total 19 (1 national + 18 ADM1), household average_per_household 19, power_coal_supply 21 (7 потребителей × 3 года). Sources 2 (022/023). Новые regions 11. Не включены: Атырау/Мангистау «-»; АлЭС, Nova Novatis, Energy Solutions Center, Кокш. Жылу, Комбыт, экспорт РФ, итоги внутреннего рынка; сумма павлодарских станций; 45,4/13,3; транспорт без источника.'
)
ON CONFLICT (id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  imported_at = EXCLUDED.imported_at,
  import_type = EXCLUDED.import_type,
  status = EXCLUDED.status,
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes;

DO $$
DECLARE
  n_hh_vol integer;
  n_hh_avg integer;
  n_power integer;
  n_all integer;
  n_derived integer;
  n_teb integer;
  kz_vol numeric;
  astana_vol numeric;
  karaganda_vol numeric;
  pavlodar_vol numeric;
  nko_vol numeric;
  akmola_vol numeric;
  abai_vol numeric;
  eko_vol numeric;
  ulytau_vol numeric;
  astana_avg numeric;
  karaganda_avg numeric;
  pavlodar_avg numeric;
  nko_avg numeric;
  akmola_avg numeric;
  gres1_2025 numeric;
BEGIN
  SELECT COUNT(*) INTO n_hh_vol
  FROM public.regional_coal_energy
  WHERE metric_type = 'household_coal_consumption' AND measure_kind = 'total_volume';
  SELECT COUNT(*) INTO n_hh_avg
  FROM public.regional_coal_energy
  WHERE metric_type = 'household_coal_consumption' AND measure_kind = 'average_per_household';
  SELECT COUNT(*) INTO n_power
  FROM public.regional_coal_energy
  WHERE metric_type = 'power_coal_supply';
  SELECT COUNT(*) INTO n_all
  FROM public.regional_coal_energy e
  JOIN phase7_obs_intent i ON i.id = e.id;
  SELECT COUNT(*) INTO n_derived
  FROM public.regional_coal_energy
  WHERE is_derived = true;
  SELECT COUNT(*) INTO n_teb
  FROM public.energy_balance
  WHERE id IN (
    '88888888-8888-4888-8888-888888888001',
    '88888888-8888-4888-8888-888888888002'
  ) AND value IN (45.4, 13.3);

  IF n_hh_vol <> 19 OR n_hh_avg <> 19 OR n_power <> 21 OR n_all <> 59 THEN
    RAISE EXCEPTION 'Этап 7: неожиданные COUNT (vol %, avg %, power %, all %).', n_hh_vol, n_hh_avg, n_power, n_all;
  END IF;
  IF n_derived <> 0 THEN
    RAISE EXCEPTION 'Этап 7: найдены derived-строки.';
  END IF;
  IF n_teb <> 2 THEN
    RAISE EXCEPTION 'Этап 7: повреждены headline ТЭБ 45,4/13,3.';
  END IF;

  SELECT value INTO kz_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70001';
  SELECT value INTO astana_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70017';
  SELECT value INTO karaganda_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70009';
  SELECT value INTO pavlodar_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70012';
  SELECT value INTO nko_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70013';
  SELECT value INTO akmola_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70003';
  SELECT value INTO abai_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70002';
  SELECT value INTO eko_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70016';
  SELECT value INTO ulytau_vol FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70015';
  SELECT value INTO astana_avg FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70036';
  SELECT value INTO karaganda_avg FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70028';
  SELECT value INTO pavlodar_avg FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70031';
  SELECT value INTO nko_avg FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70032';
  SELECT value INTO akmola_avg FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70022';
  SELECT value INTO gres1_2025 FROM public.regional_coal_energy WHERE id = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e70050';

  IF kz_vol <> 7312097906 THEN
    RAISE EXCEPTION 'Этап 7: national household volume % не совпадает с 7312097906 кг.', kz_vol;
  END IF;
  IF astana_vol <> 39020612 OR karaganda_vol <> 2606398148 OR pavlodar_vol <> 277534983
     OR nko_vol <> 341110544 OR akmola_vol <> 471805367 OR abai_vol <> 1277371768
     OR eko_vol <> 1578552422 OR ulytau_vol <> 101309790 THEN
    RAISE EXCEPTION 'Этап 7: контрольный объём household не совпал с листом 2.4.';
  END IF;
  IF astana_avg <> 8384 OR karaganda_avg <> 6864 OR pavlodar_avg <> 8064
     OR nko_avg <> 8810 OR akmola_avg <> 6745 THEN
    RAISE EXCEPTION 'Этап 7: контрольное среднее на домохозяйство не совпало с листом 2.5.';
  END IF;
  IF gres1_2025 <> 14.79 THEN
    RAISE EXCEPTION 'Этап 7: ЭГРЭС-1 2025 % не 14,79.', gres1_2025;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regional_coal_energy
    WHERE metric_type = 'household_coal_consumption' AND region_id IS NOT NULL
    GROUP BY region_id, measure_kind
    HAVING COUNT(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Этап 7: дубль household по региону.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions r
    WHERE r.code IN ('atyrau', 'mangystau')
      AND EXISTS (
        SELECT 1 FROM public.regional_coal_energy e WHERE e.region_id = r.id
      )
  ) THEN
    RAISE EXCEPTION 'Этап 7: нельзя заносить Атырау/Мангистау: в источнике «-».';
  END IF;
END $$;

COMMIT;

-- household total_volume: 19
-- household average_per_household: 19
-- power_coal_supply: 21
-- total observations: 59
