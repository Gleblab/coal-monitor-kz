-- Seed только подтвержденных показателей из src/data/catalog.js и src/data/sources.js.
-- Не запускался из приложения. Не удаляет JS-каталог.
-- Повторный запуск безопасен: ON CONFLICT (id) DO UPDATE.

-- Стабильные UUID (не случайные), чтобы фронт мог позже сопоставить записи.

-- sources
INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES
  (
    '11111111-1111-4111-8111-111111111001',
    'bnsReserves2024',
    'Бюро национальной статистики Республики Казахстан',
    'Счет минеральных и энергетических ресурсов Республики Казахстан (На конец 2024 года)',
    'https://stat.gov.kz/ru/industries/environment/stat-speu/publications/504418/',
    'official',
    NULL,
    DATE '2026-09-24',
    'Дата retrieved_at — включение источника в каталог приложения, не дата публикации БНС. Показатели: запасы угля на конец 2024 года; добыча в рамках статистического счета за 2024 год.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111002',
    'bnsTeb2025',
    'Бюро национальной статистики Республики Казахстан',
    'Топливно-энергетический баланс Республики Казахстан (2025г.)',
    'https://stat.gov.kz/ru/industries/business-statistics/stat-energy/publications/509795/',
    'official',
    NULL,
    DATE '2026-09-24',
    'Показатели: доля угля в общем первичном потреблении энергии, 2025; доля угля в конечном потреблении энергии, 2025.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111003',
    'minenergo2025',
    'Министерство энергетики Республики Казахстан',
    'Официальное сообщение об итогах угольной отрасли за 2025 год и планах на 2026 год',
    'https://www.gov.kz/memleket/entities/energo/press/news/details/1221846?lang=ru',
    'official',
    NULL,
    DATE '2026-09-24',
    'Период публикации в каталоге: 2025 год (факт), 2026 год (план / ожидания). Точная календарная дата публикации в модель не заносилась.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111004',
    'azrkConcentration',
    'Агентство по защите и развитию конкуренции Республики Казахстан',
    'Официальное сообщение о состоянии конкуренции на рынке угля, включая концентрацию сегментов первичной оптовой реализации и накопленную динамику цен',
    'https://www.gov.kz/memleket/entities/zk/press/news/details/1272646?lang=ru',
    'official',
    NULL,
    DATE '2026-09-24',
    'Период в каталоге: 2024–2025 годы; динамика цен 2022–2025 годы.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111005',
    'astanaAkimat',
    'Акимат города Астаны',
    'Официальное сообщение о средних розничных ценах на уголь в г. Астана',
    'https://www.gov.kz/memleket/entities/astana/press/news/details/1291905?lang=ru',
    'regional',
    NULL,
    DATE '2026-09-24',
    'Календарная дата публикации в каталоге приложения не зафиксирована.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111006',
    'bogatyrKomir',
    'ТОО «Богатырь Комир»',
    'Официальная страница предприятия: история и производственные показатели',
    'https://bogatyr.kz/ru/about/history/',
    'company',
    NULL,
    DATE '2026-09-24',
    'Данные предприятия, не статистический счет БНС.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111007',
    'shubarkolErg',
    'Eurasian Resources Group (ERG)',
    'Страница предприятия АО «Шубарколь Комир»',
    'https://www.erg.kz/ru/enterprises/ao-shubarkol-komir',
    'company',
    NULL,
    DATE '2026-09-24',
    'Данные предприятия / группы. Производственная мощность, не фактическая добыча.',
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

-- regions (фильтр «все регионы / республика» в географию не записывается)
INSERT INTO public.regions (id, code, name, country, is_published) VALUES
  ('22222222-2222-4222-8222-222222222001', 'pavlodar', 'Павлодарская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222002', 'karaganda', 'Карагандинская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222003', 'astana', 'г. Астана', 'KZ', true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  is_published = EXCLUDED.is_published;

INSERT INTO public.companies (
  id, code, name, short_name, company_type, website, notes, is_published
) VALUES
  (
    '33333333-3333-4333-8333-333333333001',
    'bogatyr-komir',
    'ТОО «Богатырь Комир»',
    'Богатырь Комир',
    'too',
    'https://bogatyr.kz/ru/about/history/',
    'Ключевой оператор Экибастузского угольного бассейна в текущей модели.',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333002',
    'shubarkol-komir',
    'АО «Шубарколь Комир»',
    'Шубарколь Комир',
    'ao',
    'https://www.erg.kz/ru/enterprises/ao-shubarkol-komir',
    'Предприятие группы ERG. Один из крупных производителей энергетического угля Казахстана.',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333003',
    'karazhyra',
    'АО «Каражыра»',
    'Каражыра',
    'ao',
    NULL,
    'Входит в число основных производителей коммунально-бытового угля согласно материалам АЗРК.',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333004',
    'maikuben-west',
    'АО «Майкубен-Вест»',
    'Майкубен-Вест',
    'ao',
    NULL,
    'Ключевой производитель Майкубенского угольного бассейна в текущей модели. Входит в число основных производителей коммунально-бытового угля согласно материалам АЗРК.',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333005',
    'erg',
    'Eurasian Resources Group (ERG)',
    'ERG',
    'group',
    'https://www.erg.kz/ru/enterprises/ao-shubarkol-komir',
    'Указана АЗРК как участник сегментов первичной оптовой реализации. Не является отдельным разрезом.',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333006',
    'kazakhmys-coal',
    'ТОО «Kazakhmys Coal»',
    'Kazakhmys Coal',
    'too',
    NULL,
    'Название указано АЗРК среди крупнейших участников сегмента угля для энергопроизводящих организаций. Отдельные запасы и добыча в модель не включались.',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  company_type = EXCLUDED.company_type,
  website = EXCLUDED.website,
  notes = EXCLUDED.notes,
  is_published = EXCLUDED.is_published;

-- Активы. Карагандинский бассейн исключён: в приложении нет первоисточника.
INSERT INTO public.coal_assets (
  id, code, name, asset_type, region_id, parent_asset_id, operator_company_id,
  coal_type, description, source_id, is_published
) VALUES
  (
    '44444444-4444-4444-8444-444444444001',
    'ekibastuz-basin',
    'Экибастузский угольный бассейн',
    'basin',
    '22222222-2222-4222-8222-222222222001',
    NULL,
    '33333333-3333-4333-8333-333333333001',
    'energy',
    'Цифра 2,62 млрд т относится к балансовым запасам ТОО «Богатырь Комир», а не к запасам всего Экибастузского бассейна.',
    '11111111-1111-4111-8111-111111111006',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444002',
    'bogatyr-company',
    'ТОО «Богатырь Комир»',
    'enterprise',
    '22222222-2222-4222-8222-222222222001',
    '44444444-4444-4444-8444-444444444001',
    '33333333-3333-4333-8333-333333333001',
    'energy',
    'Балансовые запасы ТОО «Богатырь Комир». Производственная мощность предприятия: 42 млн т угля в год.',
    '11111111-1111-4111-8111-111111111006',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444003',
    'bogatyr-pit',
    'Разрез «Богатырь»',
    'mine',
    '22222222-2222-4222-8222-222222222001',
    '44444444-4444-4444-8444-444444444002',
    '33333333-3333-4333-8333-333333333001',
    'energy',
    'Основной разрез ТОО «Богатырь Комир».',
    '11111111-1111-4111-8111-111111111006',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444004',
    'severny-pit',
    'Разрез «Северный»',
    'mine',
    '22222222-2222-4222-8222-222222222001',
    '44444444-4444-4444-8444-444444444002',
    '33333333-3333-4333-8333-333333333001',
    'energy',
    'Основной разрез ТОО «Богатырь Комир».',
    '11111111-1111-4111-8111-111111111006',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444005',
    'shubarkol-deposit',
    'Шубаркольское месторождение',
    'deposit',
    '22222222-2222-4222-8222-222222222002',
    NULL,
    '33333333-3333-4333-8333-333333333002',
    'energy',
    'Не смешивать с Карагандинским угольным бассейном. Точный показатель запасов месторождения в текущую модель не включён.',
    '11111111-1111-4111-8111-111111111007',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444006',
    'shubarkol-company',
    'АО «Шубарколь Комир»',
    'enterprise',
    '22222222-2222-4222-8222-222222222002',
    '44444444-4444-4444-8444-444444444005',
    '33333333-3333-4333-8333-333333333002',
    'energy',
    'Основные разрезы: «Центральный» и «Западный». Источник данных о предприятии: ERG.',
    '11111111-1111-4111-8111-111111111007',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444007',
    'shubarkol-central',
    'Разрез «Центральный»',
    'mine',
    '22222222-2222-4222-8222-222222222002',
    '44444444-4444-4444-8444-444444444006',
    '33333333-3333-4333-8333-333333333002',
    'energy',
    'Основной разрез АО «Шубарколь Комир» на Шубаркольском месторождении.',
    '11111111-1111-4111-8111-111111111007',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444008',
    'shubarkol-west',
    'Разрез «Западный»',
    'mine',
    '22222222-2222-4222-8222-222222222002',
    '44444444-4444-4444-8444-444444444006',
    '33333333-3333-4333-8333-333333333002',
    'energy',
    'Основной разрез АО «Шубарколь Комир» на Шубаркольском месторождении.',
    '11111111-1111-4111-8111-111111111007',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444009',
    'karazhyra-deposit',
    'Месторождение Каражыра',
    'deposit',
    NULL,
    NULL,
    '33333333-3333-4333-8333-333333333003',
    'household',
    'АО «Каражыра» входит в число основных производителей коммунально-бытового угля согласно материалам АЗРК. Регион в текущей модели не подтверждён. Запасы не занесены.',
    '11111111-1111-4111-8111-111111111004',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444010',
    'maikuben-basin',
    'Майкубенский угольный бассейн',
    'basin',
    NULL,
    NULL,
    '33333333-3333-4333-8333-333333333004',
    'household',
    'Оценка запасов бассейна не приводится. АО «Майкубен-Вест» входит в число основных производителей коммунально-бытового угля согласно материалам АЗРК. Регион в текущей модели не подтверждён.',
    '11111111-1111-4111-8111-111111111004',
    true
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
  is_published = EXCLUDED.is_published;

-- Запасы: три разных методологии, не суммировать.
INSERT INTO public.reserves (
  id, asset_id, value, unit, reserve_type, period_date, source_id,
  methodology_note, data_status, is_verified, is_published
) VALUES
  (
    '55555555-5555-4555-8555-555555555001',
    NULL,
    28.7185,
    'млрд т',
    'bns_statistical',
    DATE '2024-12-31',
    '11111111-1111-4111-8111-111111111001',
    'Статистический учет запасов БНС, конец 2024 года. Не смешивать с отраслевой оценкой Министерства энергетики и с балансовыми запасами предприятий.',
    'official',
    true,
    true
  ),
  (
    '55555555-5555-4555-8555-555555555002',
    NULL,
    33.6,
    'млрд т',
    'industry_estimate',
    NULL,
    '11111111-1111-4111-8111-111111111003',
    'Отраслевая оценка общего объёма запасов в сообщении об итогах 2025 года. Министерство энергетики указывает, что при текущих объёмах добычи этих ресурсов достаточно более чем на 300 лет. Показатель не усредняется со счетом БНС. Календарная дата оценки в источнике каталога не выделена отдельно от публикации.',
    'industry',
    true,
    true
  ),
  (
    '55555555-5555-4555-8555-555555555003',
    '44444444-4444-4444-8444-444444444002',
    2.62,
    'млрд т',
    'company_balance',
    NULL,
    '11111111-1111-4111-8111-111111111006',
    'Балансовые запасы ТОО «Богатырь Комир». Не являются запасами всего Экибастузского бассейна.',
    'company',
    true,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  asset_id = EXCLUDED.asset_id,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  reserve_type = EXCLUDED.reserve_type,
  period_date = EXCLUDED.period_date,
  source_id = EXCLUDED.source_id,
  methodology_note = EXCLUDED.methodology_note,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published;

-- Добыча (факт/план) и отдельно мощности (не добыча).
INSERT INTO public.production (
  id, asset_id, company_id, region_id, value, unit, period_start, period_end,
  period_type, measure_kind, source_id, data_status, is_verified, is_published,
  is_approximate, notes
) VALUES
  (
    '66666666-6666-4666-8666-666666666001',
    NULL, NULL, NULL,
    90.2, 'млн т',
    DATE '2024-01-01', DATE '2024-12-31',
    'year', 'actual',
    '11111111-1111-4111-8111-111111111001',
    'official', true, true, false,
    'Добыча в рамках статистического счета минеральных и энергетических ресурсов за 2024 год. Не сопоставлять автоматически с 115 млн т Минэнерго за 2025 год.'
  ),
  (
    '66666666-6666-4666-8666-666666666002',
    NULL, NULL, NULL,
    115, 'млн т',
    DATE '2025-01-01', DATE '2025-12-31',
    'year', 'actual',
    '11111111-1111-4111-8111-111111111003',
    'official', true, true, false,
    'Отраслевой итог Министерства энергетики за 2025 год. Не заменяет 90,2 млн т из счета БНС за 2024 год.'
  ),
  (
    '66666666-6666-4666-8666-666666666003',
    NULL, NULL, NULL,
    128.9, 'млн т',
    DATE '2026-01-01', DATE '2026-12-31',
    'plan_year', 'plan',
    '11111111-1111-4111-8111-111111111003',
    'plan', true, true, false,
    'Плановый показатель. Не является фактической добычей 2026 года.'
  ),
  (
    '66666666-6666-4666-8666-666666666004',
    '44444444-4444-4444-8444-444444444002',
    '33333333-3333-4333-8333-333333333001',
    '22222222-2222-4222-8222-222222222001',
    42, 'млн т в год',
    NULL, NULL,
    'named_capacity', 'capacity',
    '11111111-1111-4111-8111-111111111006',
    'company', true, true, false,
    'Производственная мощность предприятия ТОО «Богатырь Комир», не фактическая добыча за год.'
  ),
  (
    '66666666-6666-4666-8666-666666666005',
    '44444444-4444-4444-8444-444444444003',
    '33333333-3333-4333-8333-333333333001',
    '22222222-2222-4222-8222-222222222001',
    32, 'млн т в год',
    NULL, NULL,
    'named_capacity', 'capacity',
    '11111111-1111-4111-8111-111111111006',
    'company', true, true, false,
    'Проектная/производственная мощность разреза «Богатырь». Не является фактической добычей.'
  ),
  (
    '66666666-6666-4666-8666-666666666006',
    '44444444-4444-4444-8444-444444444004',
    '33333333-3333-4333-8333-333333333001',
    '22222222-2222-4222-8222-222222222001',
    10, 'млн т в год',
    NULL, NULL,
    'named_capacity', 'capacity',
    '11111111-1111-4111-8111-111111111006',
    'company', true, true, false,
    'Проектная/производственная мощность разреза «Северный». Не является фактической добычей.'
  ),
  (
    '66666666-6666-4666-8666-666666666007',
    '44444444-4444-4444-8444-444444444006',
    '33333333-3333-4333-8333-333333333002',
    '22222222-2222-4222-8222-222222222002',
    12.54, 'млн т в год',
    NULL, NULL,
    'named_capacity', 'capacity',
    '11111111-1111-4111-8111-111111111007',
    'company', true, true, false,
    'Текущая указанная производственная мощность АО «Шубарколь Комир». Не является фактической добычей.'
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

INSERT INTO public.trade (
  id, trade_type, destination_country, volume, volume_unit, value_amount, currency,
  period_start, period_end, source_id, data_status, is_verified, is_published, notes
) VALUES
  (
    '77777777-7777-4777-8777-777777777001',
    'export',
    NULL,
    30, 'млн т',
    NULL, NULL,
    DATE '2025-01-01', DATE '2025-12-31',
    '11111111-1111-4111-8111-111111111003',
    'official', true, true,
    'Объём, направленный на экспорт, по сообщению Министерства энергетики РК. Страна назначения в источнике каталога не указана.'
  ),
  (
    '77777777-7777-4777-8777-777777777002',
    'domestic_supply',
    'KZ',
    85, 'млн т',
    NULL, NULL,
    DATE '2025-01-01', DATE '2025-12-31',
    '11111111-1111-4111-8111-111111111003',
    'official', true, true,
    'Направлено на внутреннее потребление и коммунально-бытовые нужды. Формулировка источника, не расчётный остаток 115 − 30.'
  )
ON CONFLICT (id) DO UPDATE SET
  trade_type = EXCLUDED.trade_type,
  destination_country = EXCLUDED.destination_country,
  volume = EXCLUDED.volume,
  volume_unit = EXCLUDED.volume_unit,
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  source_id = EXCLUDED.source_id,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes;

INSERT INTO public.energy_balance (
  id, indicator, value, unit, year, source_id, data_status,
  is_verified, is_published, notes
) VALUES
  (
    '88888888-8888-4888-8888-888888888001',
    'Доля угля в общем первичном потреблении энергии',
    45.4, '%', 2025,
    '11111111-1111-4111-8111-111111111002',
    'official', true, true,
    'Показатель общего первичного потребления энергии. Не смешивать с долей угля в конечном потреблении (13,3%).'
  ),
  (
    '88888888-8888-4888-8888-888888888002',
    'Доля угля в конечном потреблении энергии',
    13.3, '%', 2025,
    '11111111-1111-4111-8111-111111111002',
    'official', true, true,
    'Показатель конечного потребления энергии. Не смешивать с долей угля в общем первичном потреблении (45,4%).'
  )
ON CONFLICT (id) DO UPDATE SET
  indicator = EXCLUDED.indicator,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  year = EXCLUDED.year,
  source_id = EXCLUDED.source_id,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes;

INSERT INTO public.market_shares (
  id, company_or_group, market_segment, share_percent, year, source_id,
  data_status, is_verified, is_published, notes
) VALUES
  (
    '99999999-9999-4999-8999-999999999001',
    'ERG + АО «Каражыра»',
    'Коммунально-бытовой уголь',
    74.8, 2024,
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Доля крупнейших участников сегмента рынка первичной оптовой реализации. Не является долей всего угольного рынка Казахстана.'
  ),
  (
    '99999999-9999-4999-8999-999999999002',
    'ERG + АО «Каражыра»',
    'Коммунально-бытовой уголь',
    67.9, 2025,
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Доля крупнейших участников сегмента рынка первичной оптовой реализации. Не является долей всего угольного рынка Казахстана.'
  ),
  (
    '99999999-9999-4999-8999-999999999003',
    'ТОО «Богатырь Комир» + ТОО «Kazakhmys Coal»',
    'Уголь для нужд энергопроизводящих организаций',
    84.1, 2024,
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Доля крупнейших участников сегмента рынка первичной оптовой реализации. Не является долей всего угольного рынка Казахстана.'
  ),
  (
    '99999999-9999-4999-8999-999999999004',
    'ТОО «Богатырь Комир» + ТОО «Kazakhmys Coal»',
    'Уголь для нужд энергопроизводящих организаций',
    81.6, 2025,
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Доля крупнейших участников сегмента рынка первичной оптовой реализации. Не является долей всего угольного рынка Казахстана.'
  ),
  (
    '99999999-9999-4999-8999-999999999005',
    'группа ERG',
    'Уголь для промышленных нужд',
    62.3, 2024,
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Доля крупнейших участников сегмента рынка первичной оптовой реализации. Не является долей всего угольного рынка Казахстана.'
  ),
  (
    '99999999-9999-4999-8999-999999999006',
    'группа ERG',
    'Уголь для промышленных нужд',
    69.1, 2025,
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Доля крупнейших участников сегмента рынка первичной оптовой реализации. Не является долей всего угольного рынка Казахстана.'
  )
ON CONFLICT (id) DO UPDATE SET
  company_or_group = EXCLUDED.company_or_group,
  market_segment = EXCLUDED.market_segment,
  share_percent = EXCLUDED.share_percent,
  year = EXCLUDED.year,
  source_id = EXCLUDED.source_id,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes;

-- Розничные уровни цен и отдельно накопленный рост (не тенге/тонна).
INSERT INTO public.prices (
  id, asset_id, region_id, coal_product, coal_type, price, price_max, currency,
  unit, market_level, indicator_kind, period_start, period_end, source_id,
  data_status, is_verified, is_published, notes
) VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    NULL,
    '22222222-2222-4222-8222-222222222003',
    'Шубаркуль',
    NULL,
    19500, NULL, 'KZT', 'тенге/тонна',
    'retail', 'level',
    NULL, NULL,
    '11111111-1111-4111-8111-111111111005',
    'regional', true, true,
    'Средняя розничная цена в г. Астана. Не является средней ценой по Республике Казахстан. Календарный период в источнике каталога не задан отдельной датой.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    NULL,
    '22222222-2222-4222-8222-222222222003',
    'Каражыра',
    'household',
    18800, NULL, 'KZT', 'тенге/тонна',
    'retail', 'level',
    NULL, NULL,
    '11111111-1111-4111-8111-111111111005',
    'regional', true, true,
    'Средняя розничная цена в г. Астана. Не является средней ценой по Республике Казахстан. Календарный период в источнике каталога не задан отдельной датой.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03',
    NULL,
    '22222222-2222-4222-8222-222222222003',
    'Майкуба',
    'household',
    16800, NULL, 'KZT', 'тенге/тонна',
    'retail', 'level',
    NULL, NULL,
    '11111111-1111-4111-8111-111111111005',
    'regional', true, true,
    'Средняя розничная цена в г. Астана. Не является средней ценой по Республике Казахстан. Календарный период в источнике каталога не задан отдельной датой.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04',
    NULL, NULL,
    NULL,
    'household',
    30, 35, NULL, '%',
    'wholesale_primary', 'cumulative_growth',
    DATE '2022-01-01', DATE '2025-12-31',
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Накопленный рост цен первичной оптовой реализации за 2022–2025 гг. (порядок 30–35%). Не годовой темп и не цена за тонну. Интервал сохранён как price и price_max без усреднения.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05',
    NULL, NULL,
    NULL,
    'energy',
    45, NULL, NULL, '%',
    'wholesale_primary', 'cumulative_growth',
    DATE '2022-01-01', DATE '2025-12-31',
    '11111111-1111-4111-8111-111111111004',
    'official', true, true,
    'Накопленный рост цен первичной оптовой реализации за 2022–2025 гг. (около 45%). Не годовой темп и не цена за тонну.'
  )
ON CONFLICT (id) DO UPDATE SET
  asset_id = EXCLUDED.asset_id,
  region_id = EXCLUDED.region_id,
  coal_product = EXCLUDED.coal_product,
  coal_type = EXCLUDED.coal_type,
  price = EXCLUDED.price,
  price_max = EXCLUDED.price_max,
  currency = EXCLUDED.currency,
  unit = EXCLUDED.unit,
  market_level = EXCLUDED.market_level,
  indicator_kind = EXCLUDED.indicator_kind,
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  source_id = EXCLUDED.source_id,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes;

INSERT INTO public.industry_indicators (
  id, indicator, value, unit, period_start, period_end, source_id,
  data_status, is_verified, is_published, is_approximate, notes
) VALUES
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
    'Инвестиции в отрасль',
    305, 'млрд тенге',
    DATE '2025-01-01', DATE '2025-12-31',
    '11111111-1111-4111-8111-111111111003',
    'official', true, true, false,
    'Показатель не является добычей, запасами, ценой или внешнеторговым оборотом.'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02',
    'Ожидаемые инвестиции',
    553, 'млрд тенге',
    DATE '2026-01-01', DATE '2026-12-31',
    '11111111-1111-4111-8111-111111111003',
    'plan', true, true, true,
    'В источнике указано «около 553 млрд тенге». Это ожидание, а не исполненный факт.'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03',
    'Недропользователи, добыча угля',
    40, 'ед.',
    NULL, NULL,
    '11111111-1111-4111-8111-111111111003',
    'official', true, true, false,
    'Количество недропользователей, осуществляющих добычу угля, по данным Министерства энергетики РК. Точная календарная дата «по состоянию» в каталоге не выделена отдельно от итогов 2025 года.'
  )
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

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccc01',
  NULL,
  TIMESTAMPTZ '2026-09-24 00:00:00+00',
  'manual_seed',
  'completed',
  54,
  'Первичный перенос подтвержденных показателей из JS-каталога. records_count=54 — число бизнес-записей seed (sources 7, regions 3, companies 6, coal_assets 10, reserves 3, production 7, trade 2, energy_balance 2, market_shares 6, prices 5, industry_indicators 3). Запись data_imports в это число не входит. История импорта публично не читается.'
)
ON CONFLICT (id) DO UPDATE SET
  imported_at = EXCLUDED.imported_at,
  import_type = EXCLUDED.import_type,
  status = EXCLUDED.status,
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes;
