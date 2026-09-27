-- Seed этапа 3: Богатырь (добыча/цели/инвестпрограмма), доп. спрос ≈20 и >19, логистика 600, аукцион 10 участков.
-- Не изменяет строки этапов 1–2 (в том числе production capacity 42; sources 1221846 и 1171996).
-- Не содержит 7,6 ГВт, 60,3 YTD, ж/д 19 / 17,8 / 1,2, производных +13,9 / +12,1%.
-- Повторный запуск с теми же UUID разрешён (ON CONFLICT id).
-- Останов, если эквивалентная бизнес-запись уже есть под ДРУГИМ id.
-- Не запускается из приложения.
-- Требует: migration 20260925010000, seed.sql, seed_phase2.sql.

DO $$
DECLARE
  bogatyr_company_id uuid;
  bogatyr_asset_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'program_indicators'
      AND column_name = 'value_qualifier'
  ) THEN
    RAISE EXCEPTION 'Этап 3: нет program_indicators.value_qualifier. Сначала migration 20260925010000_phase3_outlook.sql.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE code = 'bogatyr-komir') THEN
    RAISE EXCEPTION 'Этап 3: не найден companies.code = bogatyr-komir. Сначала seed.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coal_assets WHERE code = 'bogatyr-company') THEN
    RAISE EXCEPTION 'Этап 3: не найден coal_assets.code = bogatyr-company. Сначала seed.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sources WHERE code = 'minenergoShubarkol2026') THEN
    RAISE EXCEPTION 'Этап 3: не найден sources.code = minenergoShubarkol2026 (URL 1171996). Сначала seed_phase2.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sources WHERE code = 'minenergo2025') THEN
    RAISE EXCEPTION 'Этап 3: не найден sources.code = minenergo2025 (URL 1221846). Сначала seed.sql.';
  END IF;
  IF (SELECT COUNT(*) FROM public.strategic_programs WHERE program_type = 'national_project') <> 1 THEN
    RAISE EXCEPTION 'Этап 3: ожидается ровно одна strategic_programs с program_type = national_project.';
  END IF;

  SELECT id INTO bogatyr_company_id FROM public.companies WHERE code = 'bogatyr-komir';
  SELECT id INTO bogatyr_asset_id FROM public.coal_assets WHERE code = 'bogatyr-company';

  -- UUID этапа 3 не должны принадлежать чужим строкам (повтор ЭТОГО seed с теми же id — можно).
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE id = '11111111-1111-4111-8111-111111111012'
      AND code IS DISTINCT FROM 'pavlodarGenerationDemand2030'
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID source …012 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666009'
      AND NOT (measure_kind = 'actual' AND value = 42.7 AND period_start = DATE '2024-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID production …009 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666010'
      AND NOT (measure_kind = 'plan' AND value = 45.2 AND period_start = DATE '2026-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID production …010 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666011'
      AND NOT (measure_kind = 'target' AND value = 56.5 AND period_start = DATE '2032-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID production …011 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.strategic_programs
    WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'
      AND NOT (program_type = 'company_strategy' AND company_id = bogatyr_company_id AND end_year = 2032)
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID program …dd05 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.strategic_programs
    WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd06'
      AND program_type IS DISTINCT FROM 'official_estimate'
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID program …dd06 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee11'
      AND NOT (value = 360 AND indicator_kind = 'investment')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID indicator …ee11 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee12'
      AND NOT (value = 20 AND value_qualifier = 'about')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID indicator …ee12 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee13'
      AND NOT (value = 19 AND value_qualifier = 'more_than')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID indicator …ee13 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee14'
      AND NOT (value = 600 AND indicator_kind = 'infrastructure')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID indicator …ee14 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.industry_indicators
    WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04'
      AND NOT (value = 10 AND data_status = 'plan')
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID industry …bb04 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_measures
    WHERE id IN (
      '17171717-1717-4171-8171-171717170005',
      '17171717-1717-4171-8171-171717170006',
      '17171717-1717-4171-8171-171717170007',
      '17171717-1717-4171-8171-171717170008',
      '17171717-1717-4171-8171-171717170009'
    )
      AND program_id IS DISTINCT FROM 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'::uuid
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID program_measures …005–009 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_measures
    WHERE id = '17171717-1717-4171-8171-171717170010'
      AND program_id IS DISTINCT FROM (
        SELECT id FROM public.strategic_programs WHERE program_type = 'national_project'
      )
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID program_measures …010 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.data_imports
    WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccc03'
      AND records_count IS DISTINCT FROM 17
  ) THEN
    RAISE EXCEPTION 'Этап 3: UUID data_imports …cc03 занят другой записью.';
  END IF;

  -- Эквивалент под ДРУГИМ id — стоп. Тот же id — повторный запуск.
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE (code = 'pavlodarGenerationDemand2030'
        OR url = 'https://www.gov.kz/memleket/entities/pavlodar-audan/press/news/details/1187857?lang=ru')
      AND id IS DISTINCT FROM '11111111-1111-4111-8111-111111111012'
  ) THEN
    RAISE EXCEPTION 'Этап 3: source 1187857 / pavlodarGenerationDemand2030 уже есть под другим id.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.production p
    WHERE p.company_id = bogatyr_company_id
      AND p.asset_id = bogatyr_asset_id
      AND p.measure_kind = 'actual'
      AND p.value = 42.7
      AND p.period_start = DATE '2024-01-01'
      AND p.period_end = DATE '2024-12-31'
      AND p.id IS DISTINCT FROM '66666666-6666-4666-8666-666666666009'
  ) THEN
    RAISE EXCEPTION 'Этап 3: production Богатырь actual 42.7 / 2024 уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production p
    WHERE p.company_id = bogatyr_company_id
      AND p.asset_id = bogatyr_asset_id
      AND p.measure_kind = 'plan'
      AND p.value = 45.2
      AND p.period_start = DATE '2026-01-01'
      AND p.period_end = DATE '2026-12-31'
      AND p.id IS DISTINCT FROM '66666666-6666-4666-8666-666666666010'
  ) THEN
    RAISE EXCEPTION 'Этап 3: production Богатырь plan 45.2 / 2026 уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production p
    WHERE p.company_id = bogatyr_company_id
      AND p.asset_id = bogatyr_asset_id
      AND p.measure_kind = 'target'
      AND p.value = 56.5
      AND p.period_start = DATE '2032-01-01'
      AND p.period_end = DATE '2032-12-31'
      AND p.id IS DISTINCT FROM '66666666-6666-4666-8666-666666666011'
  ) THEN
    RAISE EXCEPTION 'Этап 3: production Богатырь target 56.5 / 2032 уже есть под другим id.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.strategic_programs
    WHERE program_type = 'company_strategy'
      AND company_id = bogatyr_company_id
      AND end_year = 2032
      AND id IS DISTINCT FROM 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'
  ) THEN
    RAISE EXCEPTION 'Этап 3: strategic_program Богатырь до 2032 уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.strategic_programs
    WHERE program_type = 'official_estimate'
      AND end_year = 2032
      AND id IS DISTINCT FROM 'dddddddd-dddd-4ddd-8ddd-dddddddddd06'
  ) THEN
    RAISE EXCEPTION 'Этап 3: official_estimate >19 к 2032 уже есть под другим id.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE indicator_kind = 'investment'
      AND value = 360
      AND company_id = bogatyr_company_id
      AND id IS DISTINCT FROM 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee11'
  ) THEN
    RAISE EXCEPTION 'Этап 3: program_indicator 360 млрд ₸ Богатырь уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE indicator_kind = 'demand'
      AND value = 20
      AND value_qualifier = 'about'
      AND period_end = DATE '2030-12-31'
      AND id IS DISTINCT FROM 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee12'
  ) THEN
    RAISE EXCEPTION 'Этап 3: program_indicator ≈20 к 2030 уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE indicator_kind = 'demand'
      AND value = 19
      AND value_qualifier = 'more_than'
      AND period_end = DATE '2032-12-31'
      AND id IS DISTINCT FROM 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee13'
  ) THEN
    RAISE EXCEPTION 'Этап 3: program_indicator >19 к 2032 уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_indicators
    WHERE indicator_kind = 'infrastructure'
      AND value = 600
      AND unit = 'ед. в сутки'
      AND id IS DISTINCT FROM 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee14'
  ) THEN
    RAISE EXCEPTION 'Этап 3: program_indicator 600 ед./сутки уже есть под другим id.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.industry_indicators
    WHERE value = 10
      AND data_status = 'plan'
      AND unit = 'участков'
      AND period_end = DATE '2026-12-31'
      AND id IS DISTINCT FROM 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04'
  ) THEN
    RAISE EXCEPTION 'Этап 3: industry_indicator 10 участков (plan, 2026) уже есть под другим id.';
  END IF;
END $$;

-- FK на существующие сущности через code:
--   companies.code = bogatyr-komir
--   coal_assets.code = bogatyr-company
--   sources.code = minenergoShubarkol2026  (URL …/1171996)
--   sources.code = minenergo2025           (URL …/1221846)
--   strategic_programs.program_type = national_project (ровно одна запись)
--
-- >19 млн т/год к 2032 НЕ вешается на нацпроект (другой документ и горизонт)
-- и НЕ вешается на стратегию Шубарколя/Богатыря.
-- Отдельная программа program_type = official_estimate.

-- ---------------------------------------------------------------------------
-- Новый источник (1). 1221846 и 1171996 не вставлять.
-- ---------------------------------------------------------------------------

INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES (
  '11111111-1111-4111-8111-111111111012',
  'pavlodarGenerationDemand2030',
  'Акимат Павлодарского района / официальный материал gov.kz',
  'Национальный проект по развитию угольной генерации: дополнительный спрос и логистика',
  'https://www.gov.kz/memleket/entities/pavlodar-audan/press/news/details/1187857?lang=ru',
  'official',
  NULL,
  DATE '2026-09-25',
  'Ориентир дополнительного спроса на энергетический уголь к 2030 году (около 20 млн т/год) и предусмотренное дополнительное обеспечение полувагонами (600 единиц в сутки). Не годовая добыча и не парк вагонов. Дата retrieved_at — включение в каталог.',
  true
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  organization = EXCLUDED.organization,
  publication_title = EXCLUDED.publication_title,
  url = EXCLUDED.url,
  source_type = EXCLUDED.source_type,
  retrieved_at = EXCLUDED.retrieved_at,
  notes = EXCLUDED.notes,
  is_published = EXCLUDED.is_published;

-- ---------------------------------------------------------------------------
-- Добыча / план / цель Богатырь. Не трогает capacity 42 (id …004).
-- ---------------------------------------------------------------------------

INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
)
SELECT
  v.id,
  a.id,
  c.id,
  a.region_id,
  v.value,
  v.unit,
  v.period_start,
  v.period_end,
  v.period_type,
  v.measure_kind,
  s.id,
  v.data_status,
  true,
  true,
  false,
  v.notes
FROM (
  VALUES
    (
      '66666666-6666-4666-8666-666666666009'::uuid,
      42.7,
      'млн т',
      DATE '2024-01-01',
      DATE '2024-12-31',
      'year',
      'actual',
      'official',
      'Фактическая добыча ТОО «Богатырь Комир» за 2024 год по официальному материалу Минэнерго. Не производственная мощность 42 млн т/год из источника предприятия.'
    ),
    (
      '66666666-6666-4666-8666-666666666010'::uuid,
      45.2,
      'млн т',
      DATE '2026-01-01',
      DATE '2026-12-31',
      'plan_year',
      'plan',
      'plan',
      'План добычи ТОО «Богатырь Комир» на 2026 год. Не факт 2026 года, не мощность 42 млн т/год и не республиканский план 128,9 млн т.'
    ),
    (
      '66666666-6666-4666-8666-666666666011'::uuid,
      56.5,
      'млн т в год',
      DATE '2032-01-01',
      DATE '2032-12-31',
      'year',
      'target',
      'plan',
      'Целевой показатель ТОО «Богатырь Комир» на 2032 год. Не факт добычи, не план 2026 года (45,2) и не производственная мощность 42 млн т/год.'
    )
) AS v(
  id, value, unit, period_start, period_end, period_type, measure_kind, data_status, notes
)
JOIN public.companies c ON c.code = 'bogatyr-komir'
JOIN public.coal_assets a ON a.code = 'bogatyr-company'
JOIN public.sources s ON s.code = 'minenergoShubarkol2026'
ON CONFLICT (id) DO UPDATE SET
  asset_id = EXCLUDED.asset_id,
  company_id = EXCLUDED.company_id,
  region_id = EXCLUDED.region_id,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  period_type = EXCLUDED.period_type,
  measure_kind = EXCLUDED.measure_kind,
  source_id = EXCLUDED.source_id,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  is_approximate = EXCLUDED.is_approximate,
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Программы: стратегия Богатыря (start_year NULL — в источнике только «до 2032»)
-- и отдельный официальный ориентир >19 к 2032.
-- ---------------------------------------------------------------------------

INSERT INTO public.strategic_programs (
  id, name, program_type, status, start_year, end_year, company_id, source_id,
  methodology_note, is_verified, is_published
)
SELECT
  v.id,
  v.name,
  v.program_type,
  v.status,
  v.start_year,
  v.end_year,
  v.company_id,
  s.id,
  v.methodology_note,
  true,
  true
FROM (
  VALUES
    (
      'dddddddd-dddd-4ddd-8ddd-dddddddddd05'::uuid,
      'Инвестиционная программа ТОО «Богатырь Комир»',
      'company_strategy',
      'planned',
      NULL::integer,
      2032,
      (SELECT id FROM public.companies WHERE code = 'bogatyr-komir'),
      'minenergoShubarkol2026',
      'В источнике указан горизонт «до 2032 года» без отдельной даты начала программы. start_year оставлен NULL, чтобы не выдумывать год старта. Не отраслевые инвестиции 305 / около 553 млрд ₸ и не стратегия Шубарколя 95,5 млрд ₸.'
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-dddddddddd06'::uuid,
      'Потребность в энергетическом угле для новых энергетических проектов',
      'official_estimate',
      'planned',
      NULL::integer,
      2032,
      NULL::uuid,
      'minenergoShubarkol2026',
      'Отдельный официальный ориентир к 2032 году (свыше 19 млн т/год). Не привязан к нацпроекту генерации (другой документ и горизонт 2030, ≈20 млн т) и не является программой конкретного предприятия. Не складывать с ≈20 млн т к 2030.'
    )
) AS v(
  id, name, program_type, status, start_year, end_year, company_id, source_code, methodology_note
)
JOIN public.sources s ON s.code = v.source_code
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  program_type = EXCLUDED.program_type,
  status = EXCLUDED.status,
  start_year = EXCLUDED.start_year,
  end_year = EXCLUDED.end_year,
  company_id = EXCLUDED.company_id,
  source_id = EXCLUDED.source_id,
  methodology_note = EXCLUDED.methodology_note,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Показатели программ (4).
-- ≈20 и 600 — на существующий national_project, source 1187857.
-- 360 — программа Богатыря, source 1171996.
-- >19 — программа official_estimate, source 1171996.
-- ---------------------------------------------------------------------------

INSERT INTO public.program_indicators (
  id, program_id, name, value, unit, indicator_kind,
  period_start, period_end, company_id, region_id, parent_indicator_id,
  source_id, status, methodology_note, is_verified, is_published, value_qualifier
)
SELECT
  v.id,
  v.program_id,
  v.name,
  v.value,
  v.unit,
  v.indicator_kind,
  v.period_start,
  v.period_end,
  v.company_id,
  NULL,
  NULL,
  s.id,
  v.status,
  v.methodology_note,
  true,
  true,
  v.value_qualifier
FROM (
  VALUES
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee11'::uuid,
      (SELECT id FROM public.strategic_programs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'),
      'Инвестиционная программа',
      360::numeric,
      'млрд тенге',
      'investment',
      NULL::date,
      DATE '2032-12-31',
      (SELECT id FROM public.companies WHERE code = 'bogatyr-komir'),
      'minenergoShubarkol2026',
      'plan',
      'Объём инвестиционной программы ТОО «Богатырь Комир» с горизонтом до 2032 года. Не 305 млрд ₸ за 2025 год, не около 553 млрд ₸ ожидание 2026 года и не 95,5 млрд ₸ Шубарколя.',
      'exact'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee12'::uuid,
      (SELECT id FROM public.strategic_programs WHERE program_type = 'national_project'),
      'Дополнительный спрос на энергетический уголь',
      20::numeric,
      'млн т в год',
      'demand',
      NULL::date,
      DATE '2030-12-31',
      NULL::uuid,
      'pavlodarGenerationDemand2030',
      'plan',
      'Около 20 млн т в год дополнительного спроса на энергетический уголь к 2030 году. Не добыча, не общее потребление, не экспорт, не мощность. Не складывать со свыше 19 млн т/год к 2032 году.',
      'about'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee13'::uuid,
      (SELECT id FROM public.strategic_programs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd06'),
      'Потребность в энергетическом угле для новых энергетических проектов',
      19::numeric,
      'млн т в год',
      'demand',
      NULL::date,
      DATE '2032-12-31',
      NULL::uuid,
      'minenergoShubarkol2026',
      'plan',
      'Свыше 19 млн т в год к 2032 году. value_qualifier = more_than: это не ровно 19. Не дополнительный спрос ≈20 млн т/год к 2030 и не железнодорожный объём.',
      'more_than'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee14'::uuid,
      (SELECT id FROM public.strategic_programs WHERE program_type = 'national_project'),
      'Дополнительное обеспечение полувагонами',
      600::numeric,
      'ед. в сутки',
      'infrastructure',
      NULL::date,
      DATE '2030-12-31',
      NULL::uuid,
      'pavlodarGenerationDemand2030',
      'plan',
      'Предусмотренное дополнительное обеспечение перевозок: 600 единиц полувагонов в сутки. Не существующий парк и не формулировка «купить всего 600 вагонов».',
      'exact'
    )
) AS v(
  id, program_id, name, value, unit, indicator_kind,
  period_start, period_end, company_id, source_code, status, methodology_note, value_qualifier
)
JOIN public.sources s ON s.code = v.source_code
ON CONFLICT (id) DO UPDATE SET
  program_id = EXCLUDED.program_id,
  name = EXCLUDED.name,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  indicator_kind = EXCLUDED.indicator_kind,
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  company_id = EXCLUDED.company_id,
  region_id = EXCLUDED.region_id,
  parent_indicator_id = EXCLUDED.parent_indicator_id,
  source_id = EXCLUDED.source_id,
  status = EXCLUDED.status,
  methodology_note = EXCLUDED.methodology_note,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  value_qualifier = EXCLUDED.value_qualifier,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Меры (6): пять направлений Богатыря + модернизация ж/д инфраструктуры.
-- Без количественного эффекта.
-- ---------------------------------------------------------------------------

INSERT INTO public.program_measures (
  id, program_id, company_id, name, description, measure_type,
  source_id, is_verified, is_published
)
SELECT
  v.id,
  v.program_id,
  v.company_id,
  v.name,
  v.description,
  v.measure_type,
  s.id,
  true,
  true
FROM (
  VALUES
    (
      '17171717-1717-4171-8171-171717170005'::uuid,
      (SELECT id FROM public.strategic_programs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'),
      (SELECT id FROM public.companies WHERE code = 'bogatyr-komir'),
      'Развитие объектов циклично-поточной технологии',
      'Мера инвестиционной программы. Количественный эффект в источник отдельным показателем не выделялся.',
      'technology',
      'minenergoShubarkol2026'
    ),
    (
      '17171717-1717-4171-8171-171717170006'::uuid,
      (SELECT id FROM public.strategic_programs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'),
      (SELECT id FROM public.companies WHERE code = 'bogatyr-komir'),
      'Обновление горнотранспортной техники',
      'Мера инвестиционной программы. Объём закупок отдельно в модель не заносился.',
      'equipment',
      'minenergoShubarkol2026'
    ),
    (
      '17171717-1717-4171-8171-171717170007'::uuid,
      (SELECT id FROM public.strategic_programs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'),
      (SELECT id FROM public.companies WHERE code = 'bogatyr-komir'),
      'Модернизация производственных мощностей',
      'Мера инвестиционной программы. Не отождествлять с производственной мощностью 42 млн т/год и не с целевым показателем добычи 56,5 млн т/год.',
      'other',
      'minenergoShubarkol2026'
    ),
    (
      '17171717-1717-4171-8171-171717170008'::uuid,
      (SELECT id FROM public.strategic_programs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'),
      (SELECT id FROM public.companies WHERE code = 'bogatyr-komir'),
      'Внедрение MES и цифровизация производственного управления',
      'Цифровая мера. Не показатель добычи.',
      'digital',
      'minenergoShubarkol2026'
    ),
    (
      '17171717-1717-4171-8171-171717170009'::uuid,
      (SELECT id FROM public.strategic_programs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd05'),
      (SELECT id FROM public.companies WHERE code = 'bogatyr-komir'),
      'Оптимизация грузопотоков',
      'Мера организации внутренних грузопотоков. Не объём железнодорожных перевозок отрасли и не 600 полувагонов в сутки.',
      'other',
      'minenergoShubarkol2026'
    ),
    (
      '17171717-1717-4171-8171-171717170010'::uuid,
      (SELECT id FROM public.strategic_programs WHERE program_type = 'national_project'),
      NULL::uuid,
      'Модернизация железнодорожной инфраструктуры',
      'Мера обеспечения дополнительного спроса нацпроекта. Бюджет и натуральные объёмы модернизации в источник как отдельные числа не выделялись. Не парк полувагонов.',
      'other',
      'pavlodarGenerationDemand2030'
    )
) AS v(
  id, program_id, company_id, name, description, measure_type, source_code
)
JOIN public.sources s ON s.code = v.source_code
ON CONFLICT (id) DO UPDATE SET
  program_id = EXCLUDED.program_id,
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  measure_type = EXCLUDED.measure_type,
  source_id = EXCLUDED.source_id,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published;

-- ---------------------------------------------------------------------------
-- 10 угольных участков: план аукциона до конца 2026. Не факт передачи.
-- ---------------------------------------------------------------------------

INSERT INTO public.industry_indicators (
  id, indicator, value, unit, period_start, period_end, source_id,
  data_status, is_verified, is_published, is_approximate, notes
)
SELECT
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04',
  'Угольные участки, планируемые к выставлению на аукцион прав недропользования',
  10,
  'участков',
  NULL,
  DATE '2026-12-31',
  s.id,
  'plan',
  true,
  true,
  false,
  'Планируется аукцион до конца 2026 года. Не означает, что участки переданы, введены в добычу или что число недропользователей стало 50. Не 10 новых шахт.'
FROM public.sources s
WHERE s.code = 'minenergo2025'
ON CONFLICT (id) DO UPDATE SET
  indicator = EXCLUDED.indicator,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  source_id = EXCLUDED.source_id,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  is_approximate = EXCLUDED.is_approximate,
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Журнал импорта этапа 3. records_count не включает эту строку.
-- 1 source + 3 production + 2 programs + 4 indicators + 6 measures + 1 industry = 17.
-- ---------------------------------------------------------------------------

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccc03',
  NULL,
  TIMESTAMPTZ '2026-09-25 00:00:00+00',
  'manual_seed',
  'completed',
  17,
  'Этап 3. records_count=17: sources 1, production 3, strategic_programs 2, program_indicators 4, program_measures 6, industry_indicators 1. Строка data_imports не входит. Не включены: 7,6 ГВт; 60,3 YTD; ж/д 19/17,8/1,2; производные 13,9 и 12,1%; дубли 115/128,9/305/553/40/85/30/7,8/8/11; дубль capacity 42.'
)
ON CONFLICT (id) DO UPDATE SET
  imported_at = EXCLUDED.imported_at,
  import_type = EXCLUDED.import_type,
  status = EXCLUDED.status,
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes;

-- ===========================================================================
-- READ-ONLY verification (запускать после seed; ничего не меняет).
-- Можно выделить и выполнить отдельно в SQL Editor.
-- ===========================================================================

-- 1. Новый source
-- SELECT id, code, url, is_published
-- FROM public.sources
-- WHERE code = 'pavlodarGenerationDemand2030'
--    OR url LIKE '%1187857%';

-- 2. Три production-строки Богатырь
-- SELECT p.value, p.unit, p.measure_kind, p.data_status, p.period_start, p.period_end,
--        c.code AS company_code, a.code AS asset_code, s.code AS source_code
-- FROM public.production p
-- JOIN public.companies c ON c.id = p.company_id
-- JOIN public.coal_assets a ON a.id = p.asset_id
-- JOIN public.sources s ON s.id = p.source_id
-- WHERE p.id IN (
--   '66666666-6666-4666-8666-666666666009',
--   '66666666-6666-4666-8666-666666666010',
--   '66666666-6666-4666-8666-666666666011'
-- )
-- ORDER BY p.period_start;

-- 3. Capacity 42 осталась отдельной строкой (не 42,7)
-- SELECT id, value, unit, measure_kind, notes
-- FROM public.production
-- WHERE id = '66666666-6666-4666-8666-666666666004';

-- 4. 360 млрд ₸
-- SELECT name, value, unit, value_qualifier, period_end
-- FROM public.program_indicators
-- WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee11';

-- 5. ≈20 к 2030
-- SELECT name, value, unit, value_qualifier, period_end, s.code
-- FROM public.program_indicators i
-- JOIN public.sources s ON s.id = i.source_id
-- WHERE i.id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee12';

-- 6. >19 к 2032
-- SELECT name, value, unit, value_qualifier, period_end, s.code, p.program_type
-- FROM public.program_indicators i
-- JOIN public.sources s ON s.id = i.source_id
-- JOIN public.strategic_programs p ON p.id = i.program_id
-- WHERE i.id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee13';

-- 7. 600 полувагонов/сутки
-- SELECT name, value, unit, value_qualifier, methodology_note
-- FROM public.program_indicators
-- WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee14';

-- 8. 10 участков
-- SELECT indicator, value, unit, data_status, period_end, notes
-- FROM public.industry_indicators
-- WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04';

-- 9. program_measures этапа 3
-- SELECT name, measure_type, program_id
-- FROM public.program_measures
-- WHERE id IN (
--   '17171717-1717-4171-8171-171717170005',
--   '17171717-1717-4171-8171-171717170006',
--   '17171717-1717-4171-8171-171717170007',
--   '17171717-1717-4171-8171-171717170008',
--   '17171717-1717-4171-8171-171717170009',
--   '17171717-1717-4171-8171-171717170010'
-- )
-- ORDER BY name;

-- 10. Дубли production: value недостаточно. Бизнес-ключ company/asset/period/measure_kind.
-- Пусто = нет дублей по ключу.
-- SELECT company_id, asset_id, measure_kind, period_start, period_end, COUNT(*)
-- FROM public.production
-- GROUP BY company_id, asset_id, measure_kind, period_start, period_end
-- HAVING COUNT(*) > 1;
--
-- Богатырь: не более одной actual-2024 / plan-2026 / target-2032.
-- SELECT p.measure_kind, p.period_start, p.period_end, COUNT(*)
-- FROM public.production p
-- JOIN public.companies c ON c.id = p.company_id
-- JOIN public.coal_assets a ON a.id = p.asset_id
-- WHERE c.code = 'bogatyr-komir'
--   AND a.code = 'bogatyr-company'
--   AND (
--     (p.measure_kind = 'actual' AND p.period_start = DATE '2024-01-01' AND p.period_end = DATE '2024-12-31')
--     OR (p.measure_kind = 'plan' AND p.period_start = DATE '2026-01-01' AND p.period_end = DATE '2026-12-31')
--     OR (p.measure_kind = 'target' AND p.period_start = DATE '2032-01-01' AND p.period_end = DATE '2032-12-31')
--   )
-- GROUP BY p.measure_kind, p.period_start, p.period_end
-- HAVING COUNT(*) > 1;
--
-- Контроль ключевых величин (по одной строке на пару measure_kind+value):
-- SELECT measure_kind, value, COUNT(*)
-- FROM public.production
-- WHERE (value = 115 AND measure_kind = 'actual')
--    OR (value = 128.9 AND measure_kind = 'plan')
--    OR (value = 42 AND measure_kind = 'capacity')
--    OR (value = 42.7 AND measure_kind = 'actual')
--    OR (value = 45.2 AND measure_kind = 'plan')
--    OR (value = 56.5 AND measure_kind = 'target')
-- GROUP BY measure_kind, value;

-- 11. records_count этапа 3
-- SELECT records_count, notes
-- FROM public.data_imports
-- WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccc03';

-- 12. Итоговые COUNT после этапов 1+2+3 (ожидание):
--   sources_published = 12
--   production_rows   = 11
--   programs          = 6
--   indicators        = 14
--   measures          = 10
--   industry          = 4
--   generation        = 8
--   chemistry         = 6
--   data_imports      = 3
-- Контроль, что старые id не перезаписаны: 115 / 128,9 / 7,8.
-- SELECT
--   (SELECT COUNT(*) FROM public.sources WHERE is_published) AS sources_published,
--   (SELECT COUNT(*) FROM public.production) AS production_rows,
--   (SELECT COUNT(*) FROM public.strategic_programs) AS programs,
--   (SELECT COUNT(*) FROM public.program_indicators) AS indicators,
--   (SELECT COUNT(*) FROM public.program_measures) AS measures,
--   (SELECT COUNT(*) FROM public.industry_indicators) AS industry,
--   (SELECT COUNT(*) FROM public.generation_projects) AS generation,
--   (SELECT COUNT(*) FROM public.chemistry_directions) AS chemistry,
--   (SELECT COUNT(*) FROM public.data_imports) AS data_imports,
--   (SELECT value FROM public.production WHERE id = '66666666-6666-4666-8666-666666666002') AS extraction_2025,
--   (SELECT value FROM public.production WHERE id = '66666666-6666-4666-8666-666666666003') AS plan_2026,
--   (SELECT value FROM public.program_indicators WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01') AS gw_78;
