-- Seed этапа 4: промышленный ряд БНС 2020–2024 и областные итоги 2024.
-- Не изменяет строки этапов 1–3 (в том числе 90,2 / 115 / 128,9; capacity 42; 42,7 / 45,2 / 56,5).
-- Не содержит региональных данных 2025 и не подставляет 0 за неизвестные области.
-- 113,0 млн т 2024 не заменяет 90,2 млн т счета минеральных и энергетических ресурсов.
-- Повторный запуск с теми же UUID разрешён (ON CONFLICT id).
-- Останов, если эквивалентная бизнес-запись уже есть под ДРУГИМ id.
-- Не запускается из приложения.
-- Требует: seed.sql (regions pavlodar/karaganda, production 90.2).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE code = 'bogatyr-komir') THEN
    RAISE EXCEPTION 'Этап 4: не найдены сущности этапа 1. Сначала seed.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.regions WHERE code = 'pavlodar') THEN
    RAISE EXCEPTION 'Этап 4: не найден regions.code = pavlodar. Сначала seed.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.regions WHERE code = 'karaganda') THEN
    RAISE EXCEPTION 'Этап 4: не найден regions.code = karaganda. Сначала seed.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666001'
      AND value = 90.2
      AND measure_kind = 'actual'
  ) THEN
    RAISE EXCEPTION 'Этап 4: не найдена неизменная строка 90,2 млн т (id …001). Не продолжаем.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666002'
      AND value = 115
      AND measure_kind = 'actual'
  ) THEN
    RAISE EXCEPTION 'Этап 4: не найдена неизменная строка 115 млн т Минэнерго 2025 (id …002).';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666003'
      AND value = 128.9
      AND measure_kind = 'plan'
  ) THEN
    RAISE EXCEPTION 'Этап 4: не найдена неизменная строка 128,9 млн т план 2026 (id …003).';
  END IF;

  -- UUID этапа 4 не должны принадлежать чужим строкам.
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE id = '11111111-1111-4111-8111-111111111013'
      AND code IS DISTINCT FROM 'bnsIndustryCoalProduction'
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID source …013 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE id = '22222222-2222-4222-8222-222222222004'
      AND code IS DISTINCT FROM 'abai'
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID region …004 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE id = '22222222-2222-4222-8222-222222222005'
      AND code IS DISTINCT FROM 'ulytau'
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID region …005 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666012'
      AND NOT (measure_kind = 'actual' AND value = 113.4 AND period_start = DATE '2020-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID production …012 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666013'
      AND NOT (measure_kind = 'actual' AND value = 116.2 AND period_start = DATE '2021-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID production …013 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666014'
      AND NOT (measure_kind = 'actual' AND value = 117.8 AND period_start = DATE '2022-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID production …014 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666015'
      AND NOT (measure_kind = 'actual' AND value = 116.4 AND period_start = DATE '2023-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID production …015 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666016'
      AND NOT (measure_kind = 'actual' AND value = 113 AND period_start = DATE '2024-01-01')
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID production …016 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id IN (
      '66666666-6666-4666-8666-666666666017',
      '66666666-6666-4666-8666-666666666018',
      '66666666-6666-4666-8666-666666666019',
      '66666666-6666-4666-8666-666666666020'
    )
      AND NOT (
        measure_kind = 'actual'
        AND period_start = DATE '2024-01-01'
        AND company_id IS NULL
        AND asset_id IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID production …017–020 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.data_imports
    WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccc04'
      AND records_count IS DISTINCT FROM 12
  ) THEN
    RAISE EXCEPTION 'Этап 4: UUID data_imports …cc04 занят другой записью.';
  END IF;

  -- Эквивалент под другим id — стоп. Тот же id — повторный запуск.
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE (code = 'bnsIndustryCoalProduction'
        OR url = 'https://stat.gov.kz/ru/industries/business-statistics/stat-industrial-production/dynamic-tables/')
      AND id IS DISTINCT FROM '11111111-1111-4111-8111-111111111013'
  ) THEN
    RAISE EXCEPTION 'Этап 4: source bnsIndustryCoalProduction уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE code = 'abai'
      AND id IS DISTINCT FROM '22222222-2222-4222-8222-222222222004'
  ) THEN
    RAISE EXCEPTION 'Этап 4: region abai уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE code = 'ulytau'
      AND id IS DISTINCT FROM '22222222-2222-4222-8222-222222222005'
  ) THEN
    RAISE EXCEPTION 'Этап 4: region ulytau уже есть под другим id.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.production p
    JOIN public.sources s ON s.id = p.source_id
    WHERE p.asset_id IS NULL
      AND p.company_id IS NULL
      AND p.region_id IS NULL
      AND p.measure_kind = 'actual'
      AND p.value IN (113.4, 116.2, 117.8, 116.4, 113)
      AND s.code = 'bnsIndustryCoalProduction'
      AND p.id NOT IN (
        '66666666-6666-4666-8666-666666666012',
        '66666666-6666-4666-8666-666666666013',
        '66666666-6666-4666-8666-666666666014',
        '66666666-6666-4666-8666-666666666015',
        '66666666-6666-4666-8666-666666666016'
      )
  ) THEN
    RAISE EXCEPTION 'Этап 4: национальный ряд БНС (промышленная статистика) уже есть под другим id.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.production p
    JOIN public.regions r ON r.id = p.region_id
    WHERE p.asset_id IS NULL
      AND p.company_id IS NULL
      AND p.measure_kind = 'actual'
      AND p.period_start = DATE '2024-01-01'
      AND p.period_end = DATE '2024-12-31'
      AND (
        (r.code = 'pavlodar' AND p.value = 67)
        OR (r.code = 'karaganda' AND p.value = 36.8)
        OR (r.code = 'abai' AND p.value = 7.6)
        OR (r.code = 'ulytau' AND p.value = 1)
      )
      AND p.id NOT IN (
        '66666666-6666-4666-8666-666666666017',
        '66666666-6666-4666-8666-666666666018',
        '66666666-6666-4666-8666-666666666019',
        '66666666-6666-4666-8666-666666666020'
      )
  ) THEN
    RAISE EXCEPTION 'Этап 4: областной итог БНС 2024 уже есть под другим id.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Новый источник. Не переиспользовать bnsReserves2024 (это счет ресурсов / 90,2).
-- ---------------------------------------------------------------------------

INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES (
  '11111111-1111-4111-8111-111111111013',
  'bnsIndustryCoalProduction',
  'Бюро национальной статистики Республики Казахстан',
  'Производство промышленной продукции: добыча угля (динамический ряд и региональные итоги 2024 года)',
  'https://stat.gov.kz/ru/industries/business-statistics/stat-industrial-production/dynamic-tables/',
  'official',
  NULL,
  DATE '2026-09-25',
  'Промышленная статистика БНС. Не счет минеральных и энергетических ресурсов (90,2 млн т за 2024 год, source bnsReserves2024). Не отраслевой итог Минэнерго 115 млн т за 2025 год и не план 128,9 млн т на 2026 год. Дата retrieved_at — включение в каталог.',
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
-- Новые регионы. Павлодар и Караганда уже есть в seed.sql — не дублировать.
-- ---------------------------------------------------------------------------

INSERT INTO public.regions (id, code, name, country, is_published) VALUES
  ('22222222-2222-4222-8222-222222222004', 'abai', 'область Абай', 'KZ', true),
  ('22222222-2222-4222-8222-222222222005', 'ulytau', 'область Ұлытау', 'KZ', true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  is_published = EXCLUDED.is_published;

-- ---------------------------------------------------------------------------
-- Национальный ряд 2020–2024. region_id/company_id/asset_id NULL.
-- ---------------------------------------------------------------------------

INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
)
SELECT
  v.id,
  NULL,
  NULL,
  NULL,
  v.value,
  'млн т',
  v.period_start,
  v.period_end,
  'year',
  'actual',
  s.id,
  'official',
  true,
  true,
  false,
  v.notes
FROM (
  VALUES
    (
      '66666666-6666-4666-8666-666666666012'::uuid,
      113.4,
      DATE '2020-01-01',
      DATE '2020-12-31',
      'Фактическая добыча угля по промышленной статистике БНС за 2020 год. Не счет минеральных и энергетических ресурсов и не итог Минэнерго.'
    ),
    (
      '66666666-6666-4666-8666-666666666013'::uuid,
      116.2,
      DATE '2021-01-01',
      DATE '2021-12-31',
      'Фактическая добыча угля по промышленной статистике БНС за 2021 год. Не счет минеральных и энергетических ресурсов и не итог Минэнерго.'
    ),
    (
      '66666666-6666-4666-8666-666666666014'::uuid,
      117.8,
      DATE '2022-01-01',
      DATE '2022-12-31',
      'Фактическая добыча угля по промышленной статистике БНС за 2022 год. Не счет минеральных и энергетических ресурсов и не итог Минэнерго.'
    ),
    (
      '66666666-6666-4666-8666-666666666015'::uuid,
      116.4,
      DATE '2023-01-01',
      DATE '2023-12-31',
      'Фактическая добыча угля по промышленной статистике БНС за 2023 год. Не счет минеральных и энергетических ресурсов и не итог Минэнерго.'
    ),
    (
      '66666666-6666-4666-8666-666666666016'::uuid,
      113.0,
      DATE '2024-01-01',
      DATE '2024-12-31',
      'Фактическая добыча угля по промышленной статистике БНС за 2024 год (113,0 млн т). Не заменяет 90,2 млн т из счета минеральных и энергетических ресурсов за тот же календарный год. Не 115 млн т Минэнерго за 2025 год и не план 128,9 млн т на 2026 год.'
    )
) AS v(id, value, period_start, period_end, notes)
JOIN public.sources s ON s.code = 'bnsIndustryCoalProduction'
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
-- Областные итоги только 2024. Нет строк 2025. Нет нулей по прочим областям.
-- ---------------------------------------------------------------------------

INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
)
SELECT
  v.id,
  NULL,
  NULL,
  r.id,
  v.value,
  'млн т',
  DATE '2024-01-01',
  DATE '2024-12-31',
  'year',
  'actual',
  s.id,
  'official',
  true,
  true,
  false,
  v.notes
FROM (
  VALUES
    (
      '66666666-6666-4666-8666-666666666017'::uuid,
      'pavlodar',
      67.0,
      'Добыча угля в Павлодарской области за 2024 год по промышленной статистике БНС. Не республиканский ряд 113,0, не 90,2 счета ресурсов и не итог Минэнерго 115 за 2025 год. Региональных данных за 2025 год в модель не заносилось.'
    ),
    (
      '66666666-6666-4666-8666-666666666018'::uuid,
      'karaganda',
      36.8,
      'Добыча угля в Карагандинской области за 2024 год по промышленной статистике БНС. Не республиканский ряд 113,0, не 90,2 счета ресурсов и не итог Минэнерго 115 за 2025 год. Региональных данных за 2025 год в модель не заносилось.'
    ),
    (
      '66666666-6666-4666-8666-666666666019'::uuid,
      'abai',
      7.6,
      'Добыча угля в области Абай за 2024 год по промышленной статистике БНС. Не 7,6 ГВт нацпроекта. Не республиканский ряд 113,0. Региональных данных за 2025 год в модель не заносилось.'
    ),
    (
      '66666666-6666-4666-8666-666666666020'::uuid,
      'ulytau',
      1.0,
      'Добыча угля в области Ұлытау за 2024 год по промышленной статистике БНС. Не республиканский ряд 113,0. Региональных данных за 2025 год в модель не заносилось.'
    )
) AS v(id, region_code, value, notes)
JOIN public.regions r ON r.code = v.region_code
JOIN public.sources s ON s.code = 'bnsIndustryCoalProduction'
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

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccc04',
  '11111111-1111-4111-8111-111111111013',
  TIMESTAMPTZ '2026-09-25 00:00:00+00',
  'manual_seed',
  'completed',
  12,
  'Этап 4. records_count=12: sources 1, regions 2 (Абай, Ұлытау), production 9 (национальный ряд 5 + области 2024 4). Строка data_imports не входит. Павлодар и Караганда как справочник не дублируются. Не включены: 90,2; 115; 128,9; региональные итоги 2025; нули по прочим областям; сумма областей как отдельная цифра.'
)
ON CONFLICT (id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  imported_at = EXCLUDED.imported_at,
  import_type = EXCLUDED.import_type,
  status = EXCLUDED.status,
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes;

-- ===========================================================================
-- READ-ONLY verification (после seed; ничего не меняет).
-- ===========================================================================
--
-- Ожидаемые COUNT после этапа 4 (этапы 1+2+3 + этот seed):
--   sources_published = 13
--   regions           = 5
--   production_rows   = 20
--   data_imports      = 4
--
-- 1. Ряд БНС 2020–2024 (промышленная статистика)
-- SELECT value, period_start, measure_kind, s.code
-- FROM public.production p
-- JOIN public.sources s ON s.id = p.source_id
-- WHERE p.id BETWEEN '66666666-6666-4666-8666-666666666012'
--                 AND '66666666-6666-4666-8666-666666666016'
-- ORDER BY period_start;
--
-- 2. 90,2 осталась отдельной строкой
-- SELECT id, value, s.code FROM public.production p
-- JOIN public.sources s ON s.id = p.source_id
-- WHERE p.id = '66666666-6666-4666-8666-666666666001';
--
-- 3. Области 2024, нет 2025
-- SELECT r.code, p.value, p.period_end
-- FROM public.production p
-- JOIN public.regions r ON r.id = p.region_id
-- WHERE p.company_id IS NULL AND p.asset_id IS NULL AND p.measure_kind = 'actual'
-- ORDER BY r.code, p.period_end;
--
-- SELECT COUNT(*) AS regional_2025
-- FROM public.production p
-- WHERE p.region_id IS NOT NULL AND p.company_id IS NULL AND p.asset_id IS NULL
--   AND p.period_end = DATE '2025-12-31';
-- -- ожидание: 0
--
-- 4. Stage 1 ключи на месте
-- SELECT value FROM public.production WHERE id IN (
--   '66666666-6666-4666-8666-666666666001',
--   '66666666-6666-4666-8666-666666666002',
--   '66666666-6666-4666-8666-666666666003'
-- );
