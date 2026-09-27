-- Seed этапа 5A: компании и добыча (без UI).
-- Не изменяет файлы seed.sql / seed_phase2–4.1.
-- Не трогает национальные 90,2 / 115 / 128,9 и промышленный ряд БНС 113,0 / 120,0446.
-- Не создаёт индивидуальные market_shares 66,5 / 15,1 / 41,0 / 26,9.
-- Доли АЗРК 67,9 / 81,6 / 69,1 уже в seed.sql — REUSE, не дублировать.
-- Повторный запуск: ON CONFLICT (id). Без DELETE, без ослабления RLS.
-- Не запускается из приложения.
-- Явная транзакция: ошибка в любом statement откатывает весь seed.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'production'
      AND column_name = 'series_role'
  ) THEN
    RAISE EXCEPTION 'Этап 5: нет production.series_role. Сначала migration 20260925210000_phase5_companies_exports.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coal_assets'
      AND column_name = 'mining_method'
  ) THEN
    RAISE EXCEPTION 'Этап 5: нет coal_assets.mining_method. Сначала migration 20260925210000_phase5_companies_exports.sql.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = '33333333-3333-4333-8333-333333333001' AND code = 'bogatyr-komir') THEN
    RAISE EXCEPTION 'Этап 5: не найден bogatyr-komir. Сначала seed.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = '33333333-3333-4333-8333-333333333002' AND code = 'shubarkol-komir') THEN
    RAISE EXCEPTION 'Этап 5: не найден shubarkol-komir.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = '33333333-3333-4333-8333-333333333003' AND code = 'karazhyra') THEN
    RAISE EXCEPTION 'Этап 5: не найден karazhyra.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = '33333333-3333-4333-8333-333333333004' AND code = 'maikuben-west') THEN
    RAISE EXCEPTION 'Этап 5: не найден maikuben-west.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = '33333333-3333-4333-8333-333333333006' AND code = 'kazakhmys-coal') THEN
    RAISE EXCEPTION 'Этап 5: не найден kazakhmys-coal.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.regions WHERE code = 'abai') THEN
    RAISE EXCEPTION 'Этап 5: не найден regions.code = abai. Сначала seed_phase4.sql.';
  END IF;

  -- Национальные якоря этапов 1–4.1 не должны быть перезаписаны этими UUID.
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666001' AND value IS DISTINCT FROM 90.2
  ) THEN
    RAISE EXCEPTION 'Этап 5: якорь 90,2 (id …001) повреждён. Останов.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666002' AND NOT (value = 115 AND measure_kind = 'actual')
  ) THEN
    RAISE EXCEPTION 'Этап 5: якорь 115 (id …002) повреждён. Останов.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666003' AND NOT (value = 128.9 AND measure_kind = 'plan')
  ) THEN
    RAISE EXCEPTION 'Этап 5: якорь 128,9 (id …003) повреждён. Останов.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666016' AND value IS DISTINCT FROM 112.9863
  ) THEN
    RAISE EXCEPTION 'Этап 5: якорь БНС 2024 112,9863 (id …016) повреждён. Останов.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666021' AND value IS DISTINCT FROM 120.0446
  ) THEN
    RAISE EXCEPTION 'Этап 5: якорь БНС 2025 120,0446 (id …021) повреждён. Останов.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666004' AND NOT (value = 42 AND measure_kind = 'capacity')
  ) THEN
    RAISE EXCEPTION 'Этап 5: capacity Богатырь 42 (id …004) повреждён. Останов.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666010' AND NOT (value = 45.2 AND measure_kind = 'plan')
  ) THEN
    RAISE EXCEPTION 'Этап 5: план Богатырь 45,2 (id …010) повреждён. Останов.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666011' AND NOT (value = 56.5 AND measure_kind = 'target')
  ) THEN
    RAISE EXCEPTION 'Этап 5: target Богатырь 56,5 (id …011) повреждён. Останов.';
  END IF;

  -- UUID этапа 5 не должны принадлежать чужим строкам.
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE id = '11111111-1111-4111-8111-111111111017'
      AND code IS DISTINCT FROM 'kaseShukAr2023'
  ) THEN
    RAISE EXCEPTION 'Этап 5: UUID source …017 занят другой записью.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.production
    WHERE id = '66666666-6666-4666-8666-666666666007'
      AND NOT (
        (measure_kind = 'capacity' AND value = 12.54)
        OR (measure_kind = 'actual' AND value = 12.544 AND period_start = DATE '2022-01-01')
      )
  ) THEN
    RAISE EXCEPTION 'Этап 5: UUID production …007 не является ни старой capacity 12,54, ни исправленной actual 12,544 за 2022.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.market_shares
    WHERE share_percent IN (66.5, 15.1, 41.0, 26.9)
  ) THEN
    RAISE EXCEPTION 'Этап 5: обнаружены неподтверждённые индивидуальные доли. Не продолжаем.';
  END IF;
END $$;

-- Источники компаний (KASE / Samruk-Kazyna). minenergo2025, bogatyrKomir, shubarkolErg, azrk — REUSE.
INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES
  (
    '11111111-1111-4111-8111-111111111017',
    'kaseShukAr2023',
    'АО «Шубарколь комир» / KASE',
    'Консолидированная финансовая отчётность и годовой отчёт за 2023 год',
    'https://kase.kz/',
    'company',
    DATE '2024-01-01',
    DATE '2026-09-25',
    'Источник мощности 16,9 млн т/год и actual 2022 12,544 млн т (ранее в модели ошибочно как capacity 12,54). 12,544 — добыча 2022, не мощность.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111018',
    'kaseKzhrAr',
    'АО «Каражыра» / KASE',
    'Годовые отчёты АО «Каражыра» (KASE)',
    'https://kase.kz/',
    'company',
    NULL,
    DATE '2026-09-25',
    'Actual 2023 = 7,9 млн т; 2024 = 7,5 млн т. Описание «7,5–8 млн т/год» не заносится как formal capacity.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111019',
    'kaseMkbwAr',
    'АО «Майкубен-Вест» / KASE',
    'Годовые отчёты АО «Майкубен-Вест» (KASE): 2023 original и ретроспектива 2024/2025',
    'https://kase.kz/',
    'company',
    NULL,
    DATE '2026-09-25',
    'Конфликт 2023: 3,8 млн т (годовой отчёт 2023) vs 4,0 млн т (ретроспективные таблицы 2024/2025). Обе observation сохраняются. Capacity 5,2 млн т/год — отдельный measure_kind.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111020',
    'samrukKazynaAr2025',
    'АО «Самрук-Қазына»',
    'Годовой отчёт 2025',
    'https://sk.kz/',
    'official',
    DATE '2026-01-01',
    DATE '2026-09-25',
    'Контекст добычи ТОО «Богатырь Комир». Не подменяет национальные итоги Минэнерго 115 / 128,9.',
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

UPDATE public.companies
SET notes = 'Название указано АЗРК среди крупнейших участников сегмента угля для энергопроизводящих организаций. Подтверждённых абсолютных annual actual 2023–2025 нет — numeric production rows не создаются. Проектный диапазон «Молодёжного» 9,0–10,5 млн т/год (2021–2031) хранится как описание актива, не как company actual/capacity.'
WHERE id = '33333333-3333-4333-8333-333333333006'
  AND code = 'kazakhmys-coal';

-- Регион Каражыра / Майкубен: теперь подтверждён (Абай / Павлодар).
UPDATE public.coal_assets
SET
  region_id = '22222222-2222-4222-8222-222222222004',
  mining_method = 'open_pit',
  description = 'АО «Каражыра», область Абай / Жанасемейский район. Открытая добыча. Описание «7,5–8 млн т/год» не является formal capacity.'
WHERE id = '44444444-4444-4444-8444-444444444009'
  AND code = 'karazhyra-deposit';

UPDATE public.coal_assets
SET
  region_id = '22222222-2222-4222-8222-222222222001',
  mining_method = 'open_pit',
  description = 'Майкубенский угольный бассейн, Павлодарская область. Открытая добыча. Оценка запасов бассейна в модель не включена.'
WHERE id = '44444444-4444-4444-8444-444444444010'
  AND code = 'maikuben-basin';

UPDATE public.coal_assets
SET mining_method = 'open_pit'
WHERE code IN (
  'ekibastuz-basin',
  'bogatyr-company',
  'bogatyr-pit',
  'severny-pit',
  'shubarkol-deposit',
  'shubarkol-company',
  'shubarkol-central',
  'shubarkol-west'
);

INSERT INTO public.coal_assets (
  id, code, name, asset_type, region_id, parent_asset_id, operator_company_id,
  coal_type, description, source_id, is_published, mining_method
) VALUES
  (
    '44444444-4444-4444-8444-444444444011',
    'shubarkol-east',
    'Разрез «Восточный»',
    'mine',
    '22222222-2222-4222-8222-222222222002',
    '44444444-4444-4444-8444-444444444006',
    '33333333-3333-4333-8333-333333333002',
    'energy',
    'Разрез Восточный / East на Шубаркольском месторождении (Нуринский район, Карагандинская область). Открытая добыча. Отдельная numeric capacity/actual не подтверждена.',
    '11111111-1111-4111-8111-111111111007',
    true,
    'open_pit'
  ),
  (
    '44444444-4444-4444-8444-444444444012',
    'shoptykol-deposit',
    'Месторождение Шоптыколь',
    'deposit',
    '22222222-2222-4222-8222-222222222001',
    '44444444-4444-4444-8444-444444444010',
    '33333333-3333-4333-8333-333333333004',
    'household',
    'Месторождение Шоптыколь, Павлодарская область. Открытая добыча.',
    '11111111-1111-4111-8111-111111111019',
    true,
    'open_pit'
  ),
  (
    '44444444-4444-4444-8444-444444444013',
    'maikuben-pit',
    'Разрез «Майкубенский»',
    'mine',
    '22222222-2222-4222-8222-222222222001',
    '44444444-4444-4444-8444-444444444012',
    '33333333-3333-4333-8333-333333333004',
    'household',
    'Разрез «Майкубенский» на месторождении Шоптыколь. Открытая добыча. Мощность предприятия 5,2 млн т/год — отдельная production row, не actual.',
    '11111111-1111-4111-8111-111111111019',
    true,
    'open_pit'
  ),
  (
    '44444444-4444-4444-8444-444444444014',
    'molodezhny-pit',
    'Разрез «Молодёжный»',
    'mine',
    '22222222-2222-4222-8222-222222222002',
    NULL,
    '33333333-3333-4333-8333-333333333006',
    'energy',
    'Разрез «Молодёжный», Карагандинская область, открытая добыча. Проектный диапазон 9,0–10,5 млн т/год на горизонте 2021–2031: это не consolidated company actual, не company capacity и не факт добычи. Numeric production row не создаётся.',
    '11111111-1111-4111-8111-111111111004',
    true,
    'open_pit'
  ),
  (
    '44444444-4444-4444-8444-444444444015',
    'borly-deposit',
    'Борлинское месторождение',
    'deposit',
    '22222222-2222-4222-8222-222222222002',
    NULL,
    '33333333-3333-4333-8333-333333333006',
    'energy',
    'Борлинское месторождение, Карагандинская область. Открытая добыча. Подтверждённых annual actual 2023–2025 нет.',
    '11111111-1111-4111-8111-111111111004',
    true,
    'open_pit'
  ),
  (
    '44444444-4444-4444-8444-444444444016',
    'kuu-chekinsky-pit',
    'Разрез «Куу-Чекинский»',
    'mine',
    '22222222-2222-4222-8222-222222222002',
    NULL,
    '33333333-3333-4333-8333-333333333006',
    'energy',
    'Разрез «Куу-Чекинский», Карагандинская область. Открытая добыча. Подтверждённых annual actual 2023–2025 нет.',
    '11111111-1111-4111-8111-111111111004',
    true,
    'open_pit'
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  asset_type = EXCLUDED.asset_type,
  region_id = EXCLUDED.region_id,
  parent_asset_id = EXCLUDED.parent_asset_id,
  operator_company_id = EXCLUDED.operator_company_id,
  coal_type = EXCLUDED.coal_type,
  description = EXCLUDED.description,
  source_id = EXCLUDED.source_id,
  is_published = EXCLUDED.is_published,
  mining_method = EXCLUDED.mining_method;

-- Изоляция ошибки 12,54: та же UUID …007, смена семантики capacity → actual 2022 = 12,544.
-- Не DELETE. Мощность 16,9 — новая строка …040.
UPDATE public.production
SET
  value = 12.544,
  unit = 'млн т',
  period_start = DATE '2022-01-01',
  period_end = DATE '2022-12-31',
  period_type = 'year',
  measure_kind = 'actual',
  data_status = 'company',
  is_verified = true,
  is_published = true,
  is_approximate = false,
  series_role = NULL,
  source_id = '11111111-1111-4111-8111-111111111017',
  notes = 'Ранее в модели этапа 1 значение 12,54 млн т/год было записано как production.measure_kind = capacity АО «Шубарколь Комир». По годовому отчёту 2023 это actual production 2022 = 12,544 млн т, а не мощность. Строка сохранена (тот же id), семантика исправлена. Настоящая указанная мощность 16,9 млн т/год — отдельная строка measure_kind = capacity.'
WHERE id = '66666666-6666-4666-8666-666666666007'
  AND asset_id = '44444444-4444-4444-8444-444444444006';

-- Богатырь 2024: оставляем 42,7 (id …009) как original (округление Минэнерго/программы);
-- 42,68 — revised actual из материалов предприятия/Самрук.
UPDATE public.production
SET
  series_role = 'original',
  notes = CASE
    WHEN notes LIKE '%series_role=original:%' THEN notes
    ELSE COALESCE(notes, '') || ' series_role=original: округлённый actual 42,7 млн т. Более точный официальный ряд 42,68 млн т хранится отдельно (revised). Не удалять.'
  END
WHERE id = '66666666-6666-4666-8666-666666666009'
  AND value = 42.7
  AND measure_kind = 'actual';

INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit,
  period_start, period_end, period_type, measure_kind, source_id,
  data_status, is_verified, is_published, is_approximate, notes, series_role
) VALUES
  (
    '66666666-6666-4666-8666-666666666028',
    '44444444-4444-4444-8444-444444444002',
    '33333333-3333-4333-8333-333333333001',
    '22222222-2222-4222-8222-222222222001',
    42.92, 'млн т',
    DATE '2023-01-01', DATE '2023-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111006',
    'company', true, true, false,
    'ТОО «Богатырь Комир», actual 2023. Не национальный итог. Не смешивать с capacity 42.',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666029',
    '44444444-4444-4444-8444-444444444002',
    '33333333-3333-4333-8333-333333333001',
    '22222222-2222-4222-8222-222222222001',
    42.68, 'млн т',
    DATE '2024-01-01', DATE '2024-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111006',
    'company', true, true, false,
    'ТОО «Богатырь Комир», actual 2024 = 42,68 млн т (revised относительно округления 42,7 в id …009). Не capacity 42.',
    'revised'
  ),
  (
    '66666666-6666-4666-8666-666666666030',
    '44444444-4444-4444-8444-444444444002',
    '33333333-3333-4333-8333-333333333001',
    '22222222-2222-4222-8222-222222222001',
    45.3, 'млн т',
    DATE '2025-01-01', DATE '2025-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111020',
    'official', true, true, false,
    'ТОО «Богатырь Комир», actual 2025 = 45,3 млн т. Выше опубликованного plan 2026 = 45,2. Причина расхождения официально не подтверждена. Не исправлять цифры. Не считать 45,2 actual 2026.',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666031',
    '44444444-4444-4444-8444-444444444006',
    '33333333-3333-4333-8333-333333333002',
    '22222222-2222-4222-8222-222222222002',
    13.813, 'млн т',
    DATE '2023-01-01', DATE '2023-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111017',
    'company', true, true, false,
    'АО «Шубарколь комир», actual 2023. Нет подтверждённых 2024/2025/2026 actual — строки не создаются. Не capacity 16,9.',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666032',
    '44444444-4444-4444-8444-444444444006',
    '33333333-3333-4333-8333-333333333002',
    '22222222-2222-4222-8222-222222222002',
    16.9, 'млн т в год',
    NULL, NULL, 'named_capacity', 'capacity',
    '11111111-1111-4111-8111-111111111017',
    'company', true, true, false,
    'Производственная мощность, указанная в годовом отчёте 2023: 16,9 млн т/год. Не actual 12,544 (2022) и не actual 13,813 (2023).',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666033',
    '44444444-4444-4444-8444-444444444009',
    '33333333-3333-4333-8333-333333333003',
    '22222222-2222-4222-8222-222222222004',
    7.9, 'млн т',
    DATE '2023-01-01', DATE '2023-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111018',
    'company', true, true, false,
    'АО «Каражыра», actual 2023. Нет 2025/2026 actual и нет 2026 plan. Не capacity.',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666034',
    '44444444-4444-4444-8444-444444444009',
    '33333333-3333-4333-8333-333333333003',
    '22222222-2222-4222-8222-222222222004',
    7.5, 'млн т',
    DATE '2024-01-01', DATE '2024-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111018',
    'company', true, true, false,
    'АО «Каражыра», actual 2024. Не формализовать «7,5–8 млн т/год» как capacity.',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666035',
    '44444444-4444-4444-8444-444444444013',
    '33333333-3333-4333-8333-333333333004',
    '22222222-2222-4222-8222-222222222001',
    3.8, 'млн т',
    DATE '2023-01-01', DATE '2023-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111019',
    'company', true, true, false,
    'Конфликт 2023 АО «Майкубен-Вест»: original observation 3,8 млн т (годовой отчёт 2023). Рядом revised 4,0 из ретроспективных таблиц 2024/2025. Не выбирать одно значение молча. Для графика по умолчанию — revised; UI должен уметь показать original 3,8.',
    'original'
  ),
  (
    '66666666-6666-4666-8666-666666666036',
    '44444444-4444-4444-8444-444444444013',
    '33333333-3333-4333-8333-333333333004',
    '22222222-2222-4222-8222-222222222001',
    4.0, 'млн т',
    DATE '2023-01-01', DATE '2023-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111019',
    'company', true, true, false,
    'Конфликт 2023 АО «Майкубен-Вест»: revised series 4,0 млн т (ретроспективные таблицы годовых отчётов 2024/2025). Original 3,8 сохранён отдельно.',
    'revised'
  ),
  (
    '66666666-6666-4666-8666-666666666037',
    '44444444-4444-4444-8444-444444444013',
    '33333333-3333-4333-8333-333333333004',
    '22222222-2222-4222-8222-222222222001',
    2.3, 'млн т',
    DATE '2024-01-01', DATE '2024-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111019',
    'company', true, true, false,
    'АО «Майкубен-Вест», actual 2024. Нет 2026 plan/YTD.',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666038',
    '44444444-4444-4444-8444-444444444013',
    '33333333-3333-4333-8333-333333333004',
    '22222222-2222-4222-8222-222222222001',
    1.9, 'млн т',
    DATE '2025-01-01', DATE '2025-12-31', 'year', 'actual',
    '11111111-1111-4111-8111-111111111019',
    'company', true, true, false,
    'АО «Майкубен-Вест», actual 2025. Нет 2026 plan/YTD.',
    NULL
  ),
  (
    '66666666-6666-4666-8666-666666666039',
    '44444444-4444-4444-8444-444444444013',
    '33333333-3333-4333-8333-333333333004',
    '22222222-2222-4222-8222-222222222001',
    5.2, 'млн т в год',
    NULL, NULL, 'named_capacity', 'capacity',
    '11111111-1111-4111-8111-111111111019',
    'company', true, true, false,
    'Производственная мощность 5,2 млн т/год. Не actual 3,8/4,0/2,3/1,9.',
    NULL
  )
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
  notes = EXCLUDED.notes,
  series_role = EXCLUDED.series_role;

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa15',
  '11111111-1111-4111-8111-111111111017',
  TIMESTAMPTZ '2026-09-25 00:00:00+00',
  'manual_seed',
  'completed',
  22,
  'Этап 5A. sources 4; coal_assets 6 новых + updates регионов/mining_method; production: ретег 12,544 2022, capacity 16,9, Богатырь 42,92/42,68/45,3, Шубарколь 13,813, Каражыра 7,9/7,5, Майкубен конфликт 3,8/4,0 + 2,3/1,9 + capacity 5,2. Не включены: Kazakhmys annual actual; 2024/2025/2026 actual Шубарколь; capacity Каражыра 7,5–8; индивидуальные доли 66,5/15,1/41,0/26,9; 2026 plan/YTD Майкубен. АЗРК 67,9/81,6/69,1 не дублировались. Строка data_imports в records_count не входит.'
)
ON CONFLICT (id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  imported_at = EXCLUDED.imported_at,
  import_type = EXCLUDED.import_type,
  status = EXCLUDED.status,
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes;

COMMIT;
