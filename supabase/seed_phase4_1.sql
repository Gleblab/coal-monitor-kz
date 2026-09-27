-- Seed этапа 4.1: годовой натуральный ряд БНС КСП 151102 за 2025 год
-- и уточнение точности национальных значений 2020–2024 в уже существующих UUID этапа 4.
-- Не DELETE. Не трогает id …001 / …002 / …003 (90,2 / 115 / 128,9).
-- Не создаёт production=0 и не заносит конфиденциальные «х».
-- Повторный запуск с теми же UUID разрешён.
-- Требует: seed.sql, seed_phase4.sql (source bnsIndustryCoalProduction, regions abai/ulytau).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sources WHERE code = 'bnsIndustryCoalProduction'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: нет source bnsIndustryCoalProduction. Сначала seed_phase4.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666001' AND value = 90.2
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: строка 90,2 млн т (id …001) должна остаться неизменной.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666002' AND value = 115 AND measure_kind = 'actual'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: строка 115 млн т Минэнерго 2025 (id …002) должна остаться неизменной.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666003' AND value = 128.9 AND measure_kind = 'plan'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: строка 128,9 млн т план 2026 (id …003) должна остаться неизменной.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666016'
      AND measure_kind = 'actual'
      AND period_start = DATE '2024-01-01'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: нет национального ряда этапа 4 за 2024 (id …016). Сначала seed_phase4.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.regions WHERE code = 'abai') THEN
    RAISE EXCEPTION 'Этап 4.1: нет region abai. Сначала seed_phase4.sql.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE id = '22222222-2222-4222-8222-222222222006'
      AND code IS DISTINCT FROM 'zhambyl'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: UUID region …006 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE id = '22222222-2222-4222-8222-222222222007'
      AND code IS DISTINCT FROM 'east-kazakhstan'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: UUID region …007 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE code = 'zhambyl' AND id IS DISTINCT FROM '22222222-2222-4222-8222-222222222006'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: region zhambyl уже есть под другим id.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.regions
    WHERE code = 'east-kazakhstan' AND id IS DISTINCT FROM '22222222-2222-4222-8222-222222222007'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: region east-kazakhstan уже есть под другим id.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666021'
      AND NOT (measure_kind = 'actual' AND period_start = DATE '2025-01-01' AND region_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: UUID production …021 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id IN (
      '66666666-6666-4666-8666-666666666022',
      '66666666-6666-4666-8666-666666666023',
      '66666666-6666-4666-8666-666666666024',
      '66666666-6666-4666-8666-666666666025',
      '66666666-6666-4666-8666-666666666026',
      '66666666-6666-4666-8666-666666666027'
    )
      AND NOT (
        measure_kind = 'actual'
        AND period_start = DATE '2025-01-01'
        AND company_id IS NULL
        AND asset_id IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: UUID production …022–027 занят другой записью.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.production p
    JOIN public.sources s ON s.id = p.source_id
    WHERE p.asset_id IS NULL
      AND p.company_id IS NULL
      AND p.region_id IS NULL
      AND p.measure_kind = 'actual'
      AND p.period_start = DATE '2025-01-01'
      AND s.code = 'bnsIndustryCoalProduction'
      AND p.id IS DISTINCT FROM '66666666-6666-4666-8666-666666666021'
  ) THEN
    RAISE EXCEPTION 'Этап 4.1: национальный итог БНС 2025 уже есть под другим id.';
  END IF;
END $$;

INSERT INTO public.regions (id, code, name, country, is_published) VALUES
  ('22222222-2222-4222-8222-222222222006', 'zhambyl', 'Жамбылская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222007', 'east-kazakhstan', 'Восточно-Казахстанская область', 'KZ', true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  is_published = EXCLUDED.is_published;

UPDATE public.sources
SET
  publication_title = 'Производство промышленной продукции в Республике Казахстан (1990-2025.): уголь каменный, включая лигнит и концентрат угольный',
  url = 'https://stat.gov.kz/api/iblock/element/5814/file/ru/',
  notes = 'Годовая промышленная статистика БНС, КСП 151102, лист «горнодоб». Файл актуализирован 15.07.2026. Не оперативный релиз января 2026. Не ИПП 109,8%. Не счет ресурсов 90,2 и не итог Минэнерго 115. Дата retrieved_at — включение уточнения этапа 4.1.',
  retrieved_at = DATE '2026-09-25'
WHERE code = 'bnsIndustryCoalProduction';

-- Уточнение точности национального ряда 2020–2024 (те же UUID этапа 4).
INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
)
SELECT
  v.id, NULL, NULL, NULL, v.value, 'млн т', v.period_start, v.period_end,
  'year', 'actual', s.id, 'official', true, true, false, v.notes
FROM (
  VALUES
    ('66666666-6666-4666-8666-666666666012'::uuid, 113.3991, DATE '2020-01-01', DATE '2020-12-31',
     'КСП 151102. 113 399,1 тыс. т. Не счет ресурсов и не итог Минэнерго.'),
    ('66666666-6666-4666-8666-666666666013'::uuid, 116.2187, DATE '2021-01-01', DATE '2021-12-31',
     'КСП 151102. 116 218,7 тыс. т. Не счет ресурсов и не итог Минэнерго.'),
    ('66666666-6666-4666-8666-666666666014'::uuid, 117.7912, DATE '2022-01-01', DATE '2022-12-31',
     'КСП 151102. 117 791,2 тыс. т. Не счет ресурсов и не итог Минэнерго.'),
    ('66666666-6666-4666-8666-666666666015'::uuid, 116.4239, DATE '2023-01-01', DATE '2023-12-31',
     'КСП 151102. 116 423,9 тыс. т. Не счет ресурсов и не итог Минэнерго.'),
    ('66666666-6666-4666-8666-666666666016'::uuid, 112.9863, DATE '2024-01-01', DATE '2024-12-31',
     'КСП 151102. 112 986,3 тыс. т. Не 90,2 счета ресурсов за 2024 год и не 115 млн т Минэнерго за 2025 год.')
) AS v(id, value, period_start, period_end, notes)
JOIN public.sources s ON s.code = 'bnsIndustryCoalProduction'
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  notes = EXCLUDED.notes,
  source_id = EXCLUDED.source_id;

INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
)
SELECT
  '66666666-6666-4666-8666-666666666021',
  NULL, NULL, NULL,
  120.0446,
  'млн т',
  DATE '2025-01-01',
  DATE '2025-12-31',
  'year',
  'actual',
  s.id,
  'official',
  true, true, false,
  'КСП 151102. 120 044,6 тыс. т за 2025 год по годовому файлу БНС от 15.07.2026. Не 115 млн т Минэнерго и не оперативный ряд января 2026.'
FROM public.sources s
WHERE s.code = 'bnsIndustryCoalProduction'
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  notes = EXCLUDED.notes,
  source_id = EXCLUDED.source_id,
  region_id = EXCLUDED.region_id,
  measure_kind = EXCLUDED.measure_kind,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published;

INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
)
SELECT
  v.id, NULL, NULL, r.id, v.value, 'млн т',
  DATE '2025-01-01', DATE '2025-12-31',
  'year', 'actual', s.id, 'official', true, true, false, v.notes
FROM (
  VALUES
    ('66666666-6666-4666-8666-666666666022'::uuid, 'pavlodar', 69.3115,
     'КСП 151102. 69 311,5 тыс. т за 2025 год. Не республиканский ряд и не 115 Минэнерго.'),
    ('66666666-6666-4666-8666-666666666023'::uuid, 'karaganda', 41.5232,
     'КСП 151102. 41 523,2 тыс. т за 2025 год.'),
    ('66666666-6666-4666-8666-666666666024'::uuid, 'abai', 6.9274,
     'КСП 151102. 6 927,4 тыс. т за 2025 год. Не 7,6 ГВт нацпроекта.'),
    ('66666666-6666-4666-8666-666666666025'::uuid, 'ulytau', 1.7356,
     'КСП 151102. 1 735,6 тыс. т за 2025 год.'),
    ('66666666-6666-4666-8666-666666666026'::uuid, 'zhambyl', 0.0599,
     'КСП 151102. 59,9 тыс. т за 2025 год. Положительное опубликованное значение, не ноль.'),
    ('66666666-6666-4666-8666-666666666027'::uuid, 'east-kazakhstan', 0.0056,
     'КСП 151102. 5,6 тыс. т за 2025 год. Положительное опубликованное значение, не ноль.')
) AS v(id, region_code, value, notes)
JOIN public.regions r ON r.code = v.region_code
JOIN public.sources s ON s.code = 'bnsIndustryCoalProduction'
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  region_id = EXCLUDED.region_id,
  notes = EXCLUDED.notes,
  source_id = EXCLUDED.source_id,
  measure_kind = EXCLUDED.measure_kind,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published;

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccc05',
  '11111111-1111-4111-8111-111111111013',
  TIMESTAMPTZ '2026-09-25 00:00:00+00',
  'manual_seed',
  'completed',
  9,
  'Этап 4.1. Новые business records=9: regions 2 (Жамбыл, ВКО), production 7 (национальный 2025 + 6 областей 2025). Плюс уточнение точности пяти национальных строк 2020–2024 с теми же UUID. Не включены: 115; 128,9; 90,2; оперативный январь 2026; ИПП 109,8%; «х» Акмолинская/Алматинская; нули по пустым ячейкам.'
)
ON CONFLICT (id) DO UPDATE SET
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes,
  status = EXCLUDED.status;
