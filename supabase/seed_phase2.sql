-- Seed этапа 2 «Перспективы и развитие».
-- Не изменяет строки этапа 1 (sources 001–007 и прочие id этапа 1).
-- Не содержит 7,6 ГВт и «более 19 млн т».
-- Повторный запуск: ON CONFLICT (id) DO UPDATE.
-- Не запускается из приложения.

-- ---------------------------------------------------------------------------
-- Новые источники (4). Итого с этапом 1: 11 published sources.
-- ---------------------------------------------------------------------------

INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES
  (
    '11111111-1111-4111-8111-111111111008',
    'kaenkGeneration2030',
    'Комитет атомного и энергетического надзора и контроля Министерства энергетики Республики Казахстан',
    'Национальный проект по развитию угольной генерации',
    'https://www.gov.kz/memleket/entities/kaenk/press/news/details/1191236?lang=ru',
    'official',
    NULL,
    DATE '2026-09-24',
    'Утверждённый государственный план угольной генерации на горизонт 2026–2030. Основная величина — 7,8 ГВт новых и модернизированных мощностей. Показатель 7,6 ГВт в модель не включается. Дата retrieved_at — включение в каталог приложения.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111009',
    'minenergoShubarkol2026',
    'Министерство энергетики Республики Казахстан',
    'Развитие АО «Шубарколь Комир»',
    'https://www.gov.kz/memleket/entities/energo/press/news/details/1171996?lang=ru',
    'official',
    NULL,
    DATE '2026-09-24',
    'План добычи АО «Шубарколь Комир» на 2026 год (16,1 млн т) и инвестиционная стратегия 2026–2032. 16,1 млн т — план добычи, не производственная мощность 12,54 млн т/год.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111010',
    'minenergoCoalChemistry',
    'Министерство энергетики Республики Казахстан',
    'Дорожная карта развития углехимии',
    'https://www.gov.kz/memleket/entities/energo/press/news/details/1239832?lang=ru',
    'official',
    NULL,
    DATE '2026-09-24',
    'Стратегические направления углехимии на 2026–2031 годы. Количественный прогноз производства в источник как подтверждённый ряд не включался.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111011',
    'minenergoHeating2026',
    'Министерство энергетики Республики Казахстан',
    'Подготовка к отопительному сезону 2026–2027',
    'https://www.gov.kz/memleket/entities/energo/press/news/details/1274951?lang=ru',
    'official',
    NULL,
    DATE '2026-09-24',
    'Потребность населения и коммунально-бытового сектора на отопительный сезон 2026–2027. Не смешивать с внутренним направлением 85 млн т за календарный 2025 год.',
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
-- План добычи Шубарколь 16,1 млн т (не мощность 12,54).
-- ---------------------------------------------------------------------------

INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
) VALUES
  (
    '66666666-6666-4666-8666-666666666008',
    '44444444-4444-4444-8444-444444444006',
    '33333333-3333-4333-8333-333333333002',
    '22222222-2222-4222-8222-222222222002',
    16.1, 'млн т',
    DATE '2026-01-01', DATE '2026-12-31',
    'plan_year', 'plan',
    '11111111-1111-4111-8111-111111111009',
    'plan', true, true, false,
    'План добычи АО «Шубарколь Комир» на 2026 год. Не является производственной мощностью 12,54 млн т/год и не является фактической добычей 2026 года.'
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
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Программы (4)
-- ---------------------------------------------------------------------------

INSERT INTO public.strategic_programs (
  id, name, program_type, status, start_year, end_year, company_id, source_id,
  methodology_note, is_verified, is_published
) VALUES
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Национальный проект по развитию угольной генерации',
    'national_project',
    'approved',
    2026, 2030,
    NULL,
    '11111111-1111-4111-8111-111111111008',
    'Утверждённый государственный план. 7,8 ГВт — новые и модернизированные мощности до 2030 года. Показатель 7,6 ГВт не используется. Объекты генерации не связываются с угольными активами добычи.',
    true, true
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
    'Инвестиционная стратегия АО «Шубарколь Комир»',
    'company_strategy',
    'planned',
    2026, 2032,
    '33333333-3333-4333-8333-333333333002',
    '11111111-1111-4111-8111-111111111009',
    'Статус planned: в источнике это инвестиционная стратегия предприятия, без самостоятельной квалификации как утверждённый государственный план. Не путать с отраслевыми инвестициями 305 / около 553 млрд ₸ в industry_indicators этапа 1.',
    true, true
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    'Дорожная карта развития углехимии',
    'roadmap',
    'roadmap',
    2026, 2031,
    NULL,
    '11111111-1111-4111-8111-111111111010',
    'Стратегические направления глубокой переработки угля. Не количественный прогноз выпуска продукции.',
    true, true
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd04',
    'Отопительный сезон 2026–2027',
    'seasonal_plan',
    'seasonal_plan',
    2026, 2027,
    NULL,
    '11111111-1111-4111-8111-111111111011',
    'Сезонная потребность населения и коммунально-бытового сектора. Не годовой отраслевой поток внутреннего направления 85 млн т за 2025 год. Точные календарные границы сезона в каталог отдельной датой не заносились.',
    true, true
  )
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
-- Показатели программ (10). Сначала родители, затем дочерние.
-- ---------------------------------------------------------------------------

INSERT INTO public.program_indicators (
  id, program_id, name, value, unit, indicator_kind,
  period_start, period_end, company_id, region_id, parent_indicator_id,
  source_id, status, methodology_note, is_verified, is_published
) VALUES
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Новые и модернизированные мощности угольной генерации',
    7.8, 'ГВт', 'capacity',
    DATE '2026-01-01', DATE '2030-12-31',
    NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111008',
    'plan',
    'Утверждённый плановый показатель нацпроекта до 2030 года. Не факт установленной мощности и не 7,6 ГВт.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Новые электростанции',
    8, 'ед.', 'count',
    DATE '2026-01-01', DATE '2030-12-31',
    NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111008',
    'plan',
    'Число новых электростанций в нацпроекте. Поимённый список восьми новых объектов хранится в generation_projects.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Действующие электростанции под модернизацию',
    11, 'ед.', 'count',
    DATE '2026-01-01', DATE '2030-12-31',
    NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111008',
    'plan',
    'Счётчик программы. Поимённый перечень 11 станций в источник как подтверждённый список не включался и в generation_projects не заносится.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee04',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
    'Инвестиционная стратегия',
    95.5, 'млрд тенге', 'investment',
    DATE '2026-01-01', DATE '2032-12-31',
    '33333333-3333-4333-8333-333333333002', NULL, NULL,
    '11111111-1111-4111-8111-111111111009',
    'plan',
    'Объём инвестиционной стратегии АО «Шубарколь Комир» на 2026–2032 годы. Не отраслевые инвестиции 305 млрд ₸ за 2025 год.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee06',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd04',
    'Общая потребность населения и коммунально-бытового сектора',
    7.3, 'млн т', 'demand',
    NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111011',
    'official',
    'Потребность отопительного сезона 2026–2027. Не внутреннее направление 85 млн т за 2025 год. Сумма дочерних строк в модели не пересчитывается.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee09',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd04',
    'Железнодорожные тупики',
    951, 'ед.', 'infrastructure',
    NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111011',
    'official',
    'Инфраструктура реализации угля в отопительный сезон. Не объём добычи.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee10',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd04',
    'Операторы реализации',
    586, 'ед.', 'infrastructure',
    NULL, NULL, NULL, NULL, NULL,
    '11111111-1111-4111-8111-111111111011',
    'official',
    'Число операторов. Не объём добычи и не экспорт.',
    true, true
  )
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
  updated_at = now();

INSERT INTO public.program_indicators (
  id, program_id, name, value, unit, indicator_kind,
  period_start, period_end, company_id, region_id, parent_indicator_id,
  source_id, status, methodology_note, is_verified, is_published
) VALUES
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee05',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
    'Обновление парка оборудования',
    49.4, 'млрд тенге', 'investment',
    DATE '2026-01-01', DATE '2032-12-31',
    '33333333-3333-4333-8333-333333333002', NULL,
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee04',
    '11111111-1111-4111-8111-111111111009',
    'plan',
    'Часть инвестиционной стратегии 95,5 млрд ₸ (parent_indicator_id). Не независимая вторая сумма инвестиций и не отраслевой показатель industry_indicators.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee07',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd04',
    'Потребность населения',
    5.7, 'млн т', 'demand',
    NULL, NULL, NULL, NULL,
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee06',
    '11111111-1111-4111-8111-111111111011',
    'official',
    'Разбивка общей потребности 7,3 млн т отопительного сезона 2026–2027. Значение взято из источника, не рассчитано как 7,3 − 1,6.',
    true, true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee08',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd04',
    'Потребность коммунально-бытового сектора',
    1.6, 'млн т', 'demand',
    NULL, NULL, NULL, NULL,
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee06',
    '11111111-1111-4111-8111-111111111011',
    'official',
    'Разбивка общей потребности 7,3 млн т отопительного сезона 2026–2027. Значение взято из источника, не рассчитано как 7,3 − 5,7.',
    true, true
  )
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
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Восемь новых объектов генерации. region_id NULL: точных кодов городов в regions нет.
-- 11 модернизируемых станций поимённо не добавляются.
-- ---------------------------------------------------------------------------

INSERT INTO public.generation_projects (
  id, program_id, name, project_type, capacity_mw, region_id, location_name,
  source_id, status, start_year, end_year, is_verified, is_published
) VALUES
  (
    '15151515-1515-4151-8151-151515150001',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Экибастузская ГРЭС-3',
    'new_build', 2640, NULL, 'Экибастуз',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  ),
  (
    '15151515-1515-4151-8151-151515150002',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'КЭС Курчатов',
    'new_build', 700, NULL, 'Курчатов',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  ),
  (
    '15151515-1515-4151-8151-151515150003',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Жезказган',
    'new_build', 500, NULL, 'Жезказган',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  ),
  (
    '15151515-1515-4151-8151-151515150004',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Караганда',
    'new_build', 350, NULL, 'Караганда',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  ),
  (
    '15151515-1515-4151-8151-151515150005',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Кокшетау',
    'new_build', 240, NULL, 'Кокшетау',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  ),
  (
    '15151515-1515-4151-8151-151515150006',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Экибастуз',
    'new_build', 180, NULL, 'Экибастуз',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  ),
  (
    '15151515-1515-4151-8151-151515150007',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Семей',
    'new_build', 360, NULL, 'Семей',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  ),
  (
    '15151515-1515-4151-8151-151515150008',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'Өскемен',
    'new_build', 360, NULL, 'Өскемен',
    '11111111-1111-4111-8111-111111111008',
    'approved', 2026, 2030, true, true
  )
ON CONFLICT (id) DO UPDATE SET
  program_id = EXCLUDED.program_id,
  name = EXCLUDED.name,
  project_type = EXCLUDED.project_type,
  capacity_mw = EXCLUDED.capacity_mw,
  region_id = EXCLUDED.region_id,
  location_name = EXCLUDED.location_name,
  source_id = EXCLUDED.source_id,
  status = EXCLUDED.status,
  start_year = EXCLUDED.start_year,
  end_year = EXCLUDED.end_year,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Направления углехимии (6), без объёмов.
-- ---------------------------------------------------------------------------

INSERT INTO public.chemistry_directions (
  id, program_id, name, description, source_id, is_verified, is_published
) VALUES
  (
    '16161616-1616-4161-8161-161616160001',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    'Металлургический кокс',
    NULL,
    '11111111-1111-4111-8111-111111111010',
    true, true
  ),
  (
    '16161616-1616-4161-8161-161616160002',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    'Синтетическое топливо',
    NULL,
    '11111111-1111-4111-8111-111111111010',
    true, true
  ),
  (
    '16161616-1616-4161-8161-161616160003',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    'Газ из угля',
    NULL,
    '11111111-1111-4111-8111-111111111010',
    true, true
  ),
  (
    '16161616-1616-4161-8161-161616160004',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    'Аммиак',
    NULL,
    '11111111-1111-4111-8111-111111111010',
    true, true
  ),
  (
    '16161616-1616-4161-8161-161616160005',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    'Карбамид',
    NULL,
    '11111111-1111-4111-8111-111111111010',
    true, true
  ),
  (
    '16161616-1616-4161-8161-161616160006',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    'Другая продукция глубокой переработки',
    NULL,
    '11111111-1111-4111-8111-111111111010',
    true, true
  )
ON CONFLICT (id) DO UPDATE SET
  program_id = EXCLUDED.program_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  source_id = EXCLUDED.source_id,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Текстовые меры (4)
-- ---------------------------------------------------------------------------

INSERT INTO public.program_measures (
  id, program_id, company_id, name, description, measure_type,
  source_id, is_verified, is_published
) VALUES
  (
    '17171717-1717-4171-8171-171717170001',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
    '33333333-3333-4333-8333-333333333002',
    'Второй этап ЦПВК-2',
    'Мера инвестиционной программы АО «Шубарколь Комир». Объём инвестиций по этой мере отдельно в модель не выделялся.',
    'technology',
    '11111111-1111-4111-8111-111111111009',
    true, true
  ),
  (
    '17171717-1717-4171-8171-171717170002',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
    '33333333-3333-4333-8333-333333333002',
    'Hovermap для 3D-картографирования',
    'Цифровая мера. Не показатель добычи и не мощность.',
    'digital',
    '11111111-1111-4111-8111-111111111009',
    true, true
  ),
  (
    '17171717-1717-4171-8171-171717170003',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
    '33333333-3333-4333-8333-333333333002',
    'Роботизированные автосамосвалы',
    'Мера обновления техники. Не дублирует сумму 49,4 млрд ₸ отдельным числом.',
    'equipment',
    '11111111-1111-4111-8111-111111111009',
    true, true
  ),
  (
    '17171717-1717-4171-8171-171717170004',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
    NULL,
    'Долгосрочные офтейк-контракты',
    'В источнике дорожной карты рассматриваются долгосрочные офтейк-контракты. Это мера организации сбыта, не подписанный объём и не прогноз производства.',
    'contract',
    '11111111-1111-4111-8111-111111111010',
    true, true
  )
ON CONFLICT (id) DO UPDATE SET
  program_id = EXCLUDED.program_id,
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  measure_type = EXCLUDED.measure_type,
  source_id = EXCLUDED.source_id,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Журнал импорта этапа 2. records_count не включает эту строку.
-- 4 sources + 1 production + 4 programs + 10 indicators + 8 generation
-- + 6 chemistry + 4 measures = 37.
-- ---------------------------------------------------------------------------

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccc02',
  NULL,
  TIMESTAMPTZ '2026-09-24 12:00:00+00',
  'manual_seed',
  'completed',
  37,
  'Этап 2. records_count=37: sources 4, production 1, strategic_programs 4, program_indicators 10, generation_projects 8, chemistry_directions 6, program_measures 4. Строка data_imports не входит. Не включены: 7,6 ГВт; потребность >19 млн т; поимённый список 11 модернизаций; industry_indicators этапа 1 не дополнялись.'
)
ON CONFLICT (id) DO UPDATE SET
  imported_at = EXCLUDED.imported_at,
  import_type = EXCLUDED.import_type,
  status = EXCLUDED.status,
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes;
