-- Phase 9A seed: retail_coal_observations.
-- Не трогает public.prices (19 500 / 18 800 / 16 800 остаются единственными rows каталога /retail).
-- publication_date = NULL: дата публикации gov.kz SPA не подтверждена из metadata страницы.
-- Акмолинская таблица 648203 не импортирована: HTML не извлекается (SPA-заглушка), строки не угадываются.
-- BNS monthly XLSX не импортирован: нет надёжного iblock file URL в этом прогоне.
-- Не запускается из приложения.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.retail_coal_observations') IS NULL THEN
    RAISE EXCEPTION 'Этап 9A: нет retail_coal_observations. Сначала migration 20260926230000_phase9_retail_coal_observations.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sources WHERE id = '11111111-1111-4111-8111-111111111005' AND code = 'astanaAkimat') THEN
    RAISE EXCEPTION 'Этап 9A: не найден source astanaAkimat (…005). Сначала seed.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.prices
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01' AND price = 19500
  ) OR NOT EXISTS (
    SELECT 1 FROM public.prices
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02' AND price = 18800
  ) OR NOT EXISTS (
    SELECT 1 FROM public.prices
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03' AND price = 16800
  ) THEN
    RAISE EXCEPTION 'Этап 9A: якоря prices 19500/18800/16800 отсутствуют. Не создавать их заново здесь.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.prices
    WHERE source_id = '11111111-1111-4111-8111-111111111005'
      AND market_level = 'retail'
      AND id NOT IN (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03'
      )
  ) THEN
    RAISE EXCEPTION 'Этап 9A: в prices уже есть лишние retail rows акимата Астаны. Не дублировать.';
  END IF;
END $$;

INSERT INTO public.regions (id, code, name, country, is_published) VALUES
  ('22222222-2222-4222-8222-222222222007', 'east-kazakhstan', 'Восточно-Казахстанская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222008', 'akmola', 'Акмолинская область', 'KZ', true),
  ('22222222-2222-4222-8222-222222222015', 'north-kazakhstan', 'Северо-Казахстанская область', 'KZ', true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  is_published = EXCLUDED.is_published;

INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES
  (
    '11111111-1111-4111-8111-111111111024',
    'nkoTimiryazevoCoal',
    'Акимат Тимирязевского района',
    'Официальное сообщение о наличии и стоимости угля на станции Сулы',
    'https://www.gov.kz/memleket/entities/zhkh-timirazevo/press/news/details/1047427?lang=ru',
    'regional',
    NULL,
    DATE '2026-09-26',
    'Point prices + stock. Не средняя по СКО и не национальная средняя. publication_date страницы не подтверждена metadata.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111025',
    'nkoTayynshaCoal',
    'Акимат района Тайынша',
    'Официальное сообщение о наличии и стоимости угля в г. Тайынша',
    'https://www.gov.kz/memleket/entities/tayinsha-oastroy/press/news/details/1047466?lang=ru',
    'regional',
    NULL,
    DATE '2026-09-26',
    'Point prices по продавцам. Не средняя по СКО.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111026',
    'nkoMamlyutkaCoal',
    'Акимат Мамлютского района',
    'Официальное сообщение о наличии и стоимости угля на станции Мамлютка (06.08.2025)',
    'https://www.gov.kz/memleket/entities/ostroy-mamlyut/press/news/details/1048717?lang=ru',
    'regional',
    DATE '2025-08-06',
    DATE '2026-09-26',
    'observation_date 2025-08-06 указана источником. Итог 551 т не является price observation.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111027',
    'akmolaAkimatCoal',
    'Акимат Акмолинской области',
    'Официальное сообщение о розничных ценах на уголь по районам/городам области',
    'https://www.gov.kz/memleket/entities/aqmola/press/news/details/648203?lang=ru',
    'regional',
    NULL,
    DATE '2026-09-26',
    'Таблица районов в Phase 9A не импортирована: страница gov.kz отдаёт SPA-заглушку, строки не восстанавливаются. Source сохранён для Phase 9B.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111028',
    'bnsRetailGoodsPrices',
    'Бюро национальной статистики Республики Казахстан',
    'Розничные цены на отдельные товары и услуги в Республике Казахстан (ежемесячные XLSX, name=19087)',
    'https://stat.gov.kz/ru/industries/economy/prices/spreadsheets/?name=19087',
    'official',
    NULL,
    DATE '2026-09-26',
    'Каталог name=19087. Проверены XLSX август 2026 (iblock 347970) и август 2025 (347969): строка «уголь каменный» отсутствует. Есть «Активированный уголь, 10 таблеток» (лекарство) и «Дрова». Не импортировать как розничный уголь. CPI +8,6% — другая публикация 280679. name=19078 (цены производителей, авг 2026 iblock 347976) — не розница.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111029',
    'bnsCoalCpi2024',
    'Бюро национальной статистики Республики Казахстан',
    'Публикация об изменении потребительских цен; каменный уголь +8,6% по итогам 2024 года',
    'https://stat.gov.kz/ru/industries/economy/prices/publications/280679/',
    'official',
    NULL,
    DATE '2026-09-26',
    '8,6% — изменение потребительских цен, не KZT/t. Не вставлять в retail_coal_observations.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111030',
    'etsShubarkol2026',
    'АО «Товарная биржа «ЕТС»',
    'График биржевых торгов коммунально-бытовым углём АО «Шубарколь Комир» на 2026 год',
    'https://ets.kz/press_centre/ads/grafik-birzhevykh-torgov-kommunalno-bytovym-uglem-ao-shubarkol-komir-na-2026/',
    'official',
    DATE '2026-03-26',
    DATE '2026-09-26',
    '492 660 т — план биржевой реализации класса 0–300 мм на 2026, не розничная цена населению.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111031',
    'ccxKarazhyraPlan2026',
    'АО «Товарная биржа Каспий»',
    'Ориентировочный план поставки коммунально-бытового угля АО «Каражыра» на внутренний рынок РК на 2026 г.',
    'https://prod.ccx.kz/ugol',
    'official',
    NULL,
    DATE '2026-09-26',
    '1 440 286 / 716 409 / 723 877 т — план поставок, не retail. Биржевые индексы FCA ст. Дегелен — producer/exchange, не цена населению.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111032',
    'kaenkHouseholdCoal2026',
    'Комитет государственного энергетического надзора и контроля Министерства энергетики Республики Казахстан',
    'Предварительные итоги Республиканского штаба по обеспечению углем коммунально-бытового сектора и населения',
    'https://www.gov.kz/memleket/entities/kaenk/press/news/details/1184037?lang=ru',
    'official',
    NULL,
    DATE '2026-09-26',
    'Подтверждено: 7,3 млн т предварительная потребность на сезон 2026–2027; 586 операторов; 951 ж/д тупик. Разбиение 5,7 / 1,6 млн т в этой публикации не найдено — не импортировано.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111033',
    'vkoOskemenCoal2026',
    'Акимат города Усть-Каменогорск',
    'Официальное сообщение о начале продажи социального угля (отопительный сезон 2026–2027)',
    'https://www.gov.kz/memleket/entities/vko-oskemen/press/news/details/1254435?lang=ru',
    'regional',
    NULL,
    DATE '2026-09-26',
    'Коммерческие цены по продавцам. Социальная цена «на 500 ₸ ниже» не развёрнута в отдельные rows. План 30 000 т — не price observation.',
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

INSERT INTO public.retail_coal_observations (
  id, source_id, region_id, locality, seller, coal_brand, coal_variant,
  price, price_min, price_max, currency, unit, stock_tonnes,
  observation_date, publication_date, publication_url,
  observation_type, geographic_scope, methodology_scope, notes,
  is_verified, is_published
)
SELECT
  v.id,
  v.source_id,
  r.id,
  v.locality,
  v.seller,
  v.coal_brand,
  v.coal_variant,
  v.price,
  NULL, NULL,
  'KZT', 't',
  v.stock_tonnes,
  v.observation_date,
  NULL,
  v.publication_url,
  v.observation_type,
  v.geographic_scope,
  v.methodology_scope,
  v.notes,
  true, true
FROM (
  VALUES
    -- Astana snapshot A / 614261
    ('99999999-9999-4999-8999-999999990001'::uuid, '11111111-1111-4111-8111-111111111005'::uuid, 'astana',
     'г. Астана', NULL, 'Шубаркуль', NULL, 15100::numeric, NULL::numeric, NULL::date,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/614261?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Источник называет средние цены. publication_date не подтверждена. Контекст источника (не цена): 11 складов, 14 точек, 8 компаний; 21459 т/сутки или 311 вагонов; заявки 364 тыс. т; поставлено 1 мая–6 сентября 149 тыс. т; запас 22 тыс. т — не price rows.'),
    ('99999999-9999-4999-8999-999999990002', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Каражыра', NULL, 15500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/614261?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot A (614261). Не национальная средняя.'),
    ('99999999-9999-4999-8999-999999990003', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Майкуба', NULL, 13500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/614261?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot A (614261). Не национальная средняя.'),

    -- Astana snapshot B / 832191
    ('99999999-9999-4999-8999-999999990004', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Шубаркуль', NULL, 16400, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/832191?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot B. Контекст источника (не цена): 11 складов, 14 точек, 9 компаний-реализаторов.'),
    ('99999999-9999-4999-8999-999999990005', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Каражыра', NULL, 17400, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/832191?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot B (832191).'),
    ('99999999-9999-4999-8999-999999990006', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Майкуба', NULL, 13500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/832191?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot B (832191). Совпадает с Майкуба snapshot A, но другая публикация.'),

    -- Astana snapshot C / 1076745
    ('99999999-9999-4999-8999-999999990007', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Шубаркуль', NULL, 18000, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/1076745?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot C. Контекст: 11 складов, 14 точек, 8 компаний.'),
    ('99999999-9999-4999-8999-999999990008', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Каражыра', NULL, 18500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/1076745?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot C (1076745).'),
    ('99999999-9999-4999-8999-999999990009', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Майкуба', NULL, 15500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/1076745?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Средняя розничная цена, snapshot C (1076745).'),

    -- Astana snapshot D / 1291905 — соответствует prices …aa01/aa02/aa03, не INSERT в prices
    ('99999999-9999-4999-8999-999999990010', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Шубаркуль', NULL, 19500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/1291905?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Соответствует public.prices id aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01. Не дублировать в prices. Контекст: 14 точек, 10 складов, 8 компаний.'),
    ('99999999-9999-4999-8999-999999990011', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Каражыра', NULL, 18800, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/1291905?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Соответствует public.prices id aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02. Не дублировать в prices.'),
    ('99999999-9999-4999-8999-999999990012', '11111111-1111-4111-8111-111111111005', 'astana',
     'г. Астана', NULL, 'Майкуба', NULL, 16800, NULL, NULL,
     'https://www.gov.kz/memleket/entities/astana/press/news/details/1291905?lang=ru',
     'average_city_price', 'city', 'akimat_retail_announcement',
     'Соответствует public.prices id aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03. Не дублировать в prices.'),

    -- Timiryazevo / Suly / 1047427
    ('99999999-9999-4999-8999-999999990013', '11111111-1111-4111-8111-111111111024', 'north-kazakhstan',
     'станция Сулы, Тимирязевский район', NULL, 'Шубаркуль', 'сортовой', 25000, 320, NULL,
     'https://www.gov.kz/memleket/entities/zhkh-timirazevo/press/news/details/1047427?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходная марка: Шубаркуль, вариант сортовой.'),
    ('99999999-9999-4999-8999-999999990014', '11111111-1111-4111-8111-111111111024', 'north-kazakhstan',
     'станция Сулы, Тимирязевский район', NULL, 'Шубаркуль', 'простой', 23000, 1550, NULL,
     'https://www.gov.kz/memleket/entities/zhkh-timirazevo/press/news/details/1047427?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходная марка: Шубаркуль, вариант простой.'),
    ('99999999-9999-4999-8999-999999990015', '11111111-1111-4111-8111-111111111024', 'north-kazakhstan',
     'станция Сулы, Тимирязевский район', NULL, 'Каражыра', NULL, 24000, 60, NULL,
     'https://www.gov.kz/memleket/entities/zhkh-timirazevo/press/news/details/1047427?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходная марка: Каражыра.'),
    ('99999999-9999-4999-8999-999999990016', '11111111-1111-4111-8111-111111111024', 'north-kazakhstan',
     'станция Сулы, Тимирязевский район', NULL, 'Майкуба', NULL, 19000, 65, NULL,
     'https://www.gov.kz/memleket/entities/zhkh-timirazevo/press/news/details/1047427?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходное написание: Майкубинский.'),
    ('99999999-9999-4999-8999-999999990017', '11111111-1111-4111-8111-111111111024', 'north-kazakhstan',
     'станция Сулы, Тимирязевский район', NULL, 'Богатырь', NULL, 13500, 140, NULL,
     'https://www.gov.kz/memleket/entities/zhkh-timirazevo/press/news/details/1047427?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходная марка: Богатырь.'),

    -- Tayynsha / 1047466
    ('99999999-9999-4999-8999-999999990018', '11111111-1111-4111-8111-111111111025', 'north-kazakhstan',
     'г. Тайынша', 'ТОО «СеверЭнергоУгольСнаб»', 'Каражыра', NULL, 20300, 6100, NULL,
     'https://www.gov.kz/memleket/entities/tayinsha-oastroy/press/news/details/1047466?lang=ru',
     'point_price', 'city', 'akimat_siding_stock_price',
     'Point price продавца. Не средняя по городу, если источник не называет её средней.'),
    ('99999999-9999-4999-8999-999999990019', '11111111-1111-4111-8111-111111111025', 'north-kazakhstan',
     'г. Тайынша', 'ИП «Стандарт»', 'Шубаркуль', NULL, 20500, 4300, NULL,
     'https://www.gov.kz/memleket/entities/tayinsha-oastroy/press/news/details/1047466?lang=ru',
     'point_price', 'city', 'akimat_siding_stock_price',
     'Исходная марка: Шубаркуль.'),
    ('99999999-9999-4999-8999-999999990020', '11111111-1111-4111-8111-111111111025', 'north-kazakhstan',
     'г. Тайынша', 'ТОО «Тамыз»', 'Каражыра', NULL, 20000, 70, NULL,
     'https://www.gov.kz/memleket/entities/tayinsha-oastroy/press/news/details/1047466?lang=ru',
     'point_price', 'city', 'akimat_siding_stock_price',
     'Point price продавца.'),
    ('99999999-9999-4999-8999-999999990021', '11111111-1111-4111-8111-111111111025', 'north-kazakhstan',
     'г. Тайынша', 'ТОО «ТЭК Альянс Жолы»', 'Каражыра', NULL, 18000, 7100, NULL,
     'https://www.gov.kz/memleket/entities/tayinsha-oastroy/press/news/details/1047466?lang=ru',
     'point_price', 'city', 'akimat_siding_stock_price',
     'Point price продавца.'),
    ('99999999-9999-4999-8999-999999990022', '11111111-1111-4111-8111-111111111025', 'north-kazakhstan',
     'г. Тайынша', 'ТОО «ТЭК Альянс Жолы»', 'Экибастуз', NULL, 13000, 44, NULL,
     'https://www.gov.kz/memleket/entities/tayinsha-oastroy/press/news/details/1047466?lang=ru',
     'point_price', 'city', 'akimat_siding_stock_price',
     'Исходная марка сохранена как Экибастуз. Не нормализовано в Богатырь без явного указания источника.'),
    ('99999999-9999-4999-8999-999999990023', '11111111-1111-4111-8111-111111111025', 'north-kazakhstan',
     'г. Тайынша', 'ТОО «ТЭК Альянс Жолы»', 'Майкуба', NULL, 16500, 131, NULL,
     'https://www.gov.kz/memleket/entities/tayinsha-oastroy/press/news/details/1047466?lang=ru',
     'point_price', 'city', 'akimat_siding_stock_price',
     'Исходное написание: Майкубинский.'),

    -- Mamlyutka / 1048717, observation_date 2025-08-06
    ('99999999-9999-4999-8999-999999990024', '11111111-1111-4111-8111-111111111026', 'north-kazakhstan',
     'станция Мамлютка, Мамлютский район', 'ТОО «ЮНА LTD»', 'Каражыра', NULL, 23000, 100, DATE '2025-08-06',
     'https://www.gov.kz/memleket/entities/ostroy-mamlyut/press/news/details/1048717?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходное написание марки: Каражаринский. Итог 551 т не является отдельным price observation.'),
    ('99999999-9999-4999-8999-999999990025', '11111111-1111-4111-8111-111111111026', 'north-kazakhstan',
     'станция Мамлютка, Мамлютский район', 'ТОО «ЮНА LTD»', 'Шубаркуль', NULL, 23000, 100, DATE '2025-08-06',
     'https://www.gov.kz/memleket/entities/ostroy-mamlyut/press/news/details/1048717?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходная марка: Шубаркуль.'),
    ('99999999-9999-4999-8999-999999990026', '11111111-1111-4111-8111-111111111026', 'north-kazakhstan',
     'станция Мамлютка, Мамлютский район', 'ТОО «KEE GROUP CKO»', 'Каражыра', NULL, 22000, 156, DATE '2025-08-06',
     'https://www.gov.kz/memleket/entities/ostroy-mamlyut/press/news/details/1048717?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходное написание марки: Каражаринский.'),
    ('99999999-9999-4999-8999-999999990027', '11111111-1111-4111-8111-111111111026', 'north-kazakhstan',
     'станция Мамлютка, Мамлютский район', 'ТОО «KEE GROUP CKO»', 'Шубаркуль', NULL, 22000, 195, DATE '2025-08-06',
     'https://www.gov.kz/memleket/entities/ostroy-mamlyut/press/news/details/1048717?lang=ru',
     'point_price', 'district', 'akimat_siding_stock_price',
     'Исходная марка: Шубаркуль. Сумма запасов продавцов не сохраняется отдельной ценой.'),

    -- Ust-Kamenogorsk / 1254435, отопительный сезон 2026–2027
    ('99999999-9999-4999-8999-999999990028', '11111111-1111-4111-8111-111111111033', 'east-kazakhstan',
     'г. Усть-Каменогорск', 'ТОО «Сейком»', 'Каражыра', NULL, 17400, NULL, NULL,
     'https://www.gov.kz/memleket/entities/vko-oskemen/press/news/details/1254435?lang=ru',
     'point_price', 'city', 'akimat_retail_announcement',
     'Источник: коммерческая цена. Сезон 2026–2027. Социальная цена не вычислена как 17400−500. Не национальная средняя.'),
    ('99999999-9999-4999-8999-999999990029', '11111111-1111-4111-8111-111111111033', 'east-kazakhstan',
     'г. Усть-Каменогорск', 'ТОО «Топливная компания Терминал»', 'Каражыра', NULL, 17500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/vko-oskemen/press/news/details/1254435?lang=ru',
     'point_price', 'city', 'akimat_retail_announcement',
     'Источник: коммерческая цена. Сезон 2026–2027. Исходное написание марки: Қаражыра тас көмірі.'),
    ('99999999-9999-4999-8999-999999990030', '11111111-1111-4111-8111-111111111033', 'east-kazakhstan',
     'г. Усть-Каменогорск', 'ТОО «Уголь-Достык»', 'Майкуба', NULL, 17500, NULL, NULL,
     'https://www.gov.kz/memleket/entities/vko-oskemen/press/news/details/1254435?lang=ru',
     'point_price', 'city', 'akimat_retail_announcement',
     'Источник: коммерческая цена. Сезон 2026–2027. Исходное написание: Майкүбі. Не вычислять социальную цену.')
) AS v(
  id, source_id, region_code, locality, seller, coal_brand, coal_variant,
  price, stock_tonnes, observation_date, publication_url,
  observation_type, geographic_scope, methodology_scope, notes
)
JOIN public.regions r ON r.code = v.region_code
ON CONFLICT (id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  region_id = EXCLUDED.region_id,
  locality = EXCLUDED.locality,
  seller = EXCLUDED.seller,
  coal_brand = EXCLUDED.coal_brand,
  coal_variant = EXCLUDED.coal_variant,
  price = EXCLUDED.price,
  stock_tonnes = EXCLUDED.stock_tonnes,
  observation_date = EXCLUDED.observation_date,
  publication_url = EXCLUDED.publication_url,
  observation_type = EXCLUDED.observation_type,
  geographic_scope = EXCLUDED.geographic_scope,
  methodology_scope = EXCLUDED.methodology_scope,
  notes = EXCLUDED.notes,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published;

UPDATE public.retail_coal_observations
SET
  period_start = DATE '2026-01-01',
  period_end = NULL
WHERE id IN (
  '99999999-9999-4999-8999-999999990028',
  '99999999-9999-4999-8999-999999990029',
  '99999999-9999-4999-8999-999999990030'
);

INSERT INTO public.industry_indicators (
  id, indicator, value, unit, period_start, period_end, source_id,
  data_status, is_verified, is_published, is_approximate, notes
) VALUES
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f001',
    'Биржевой план реализации коммунально-бытового угля АО «Шубарколь Комир», класс 0–300 мм',
    492660, 'т',
    DATE '2026-01-01', DATE '2026-12-31',
    '11111111-1111-4111-8111-111111111030',
    'plan', true, true, false,
    'ETS, объявление 26.03.2026. Не розничная цена. Не коррелировать с akimat prices.'
  ),
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f002',
    'План поставки коммунально-бытового угля АО «Каражыра» на внутренний рынок РК',
    1440286, 'т',
    DATE '2026-01-01', DATE '2026-12-31',
    '11111111-1111-4111-8111-111111111031',
    'plan', true, true, true,
    'Ориентировочный план на prod.ccx.kz/ugol. Не retail price.'
  ),
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f003',
    'План прямых контрактов АО «Каражыра» (вне биржи)',
    716409, 'т',
    DATE '2026-01-01', DATE '2026-12-31',
    '11111111-1111-4111-8111-111111111031',
    'plan', true, true, true,
    '50% плана. Не retail price.'
  ),
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f004',
    'План биржевых контрактов АО «Каражыра»',
    723877, 'т',
    DATE '2026-01-01', DATE '2026-12-31',
    '11111111-1111-4111-8111-111111111031',
    'plan', true, true, true,
    '50% плана. Не retail price.'
  ),
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f005',
    'Предварительная потребность регионов в угле на отопительный сезон 2026–2027',
    7.3, 'млн т',
    DATE '2026-01-01', DATE '2027-12-31',
    '11111111-1111-4111-8111-111111111032',
    'plan', true, true, true,
    'Источник формулирует «предварительно». Не цена. Разбиение 5,7/1,6 млн т не подтверждено этой публикацией.'
  ),
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f006',
    'Угольные операторы',
    586, 'ед.',
    NULL, NULL,
    '11111111-1111-4111-8111-111111111032',
    'official', true, true, false,
    'Инфраструктура штаба, не цена.'
  ),
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f007',
    'Железнодорожные тупики',
    951, 'ед.',
    NULL, NULL,
    '11111111-1111-4111-8111-111111111032',
    'official', true, true, false,
    'Инфраструктура штаба, не цена.'
  ),
  (
    'f9f9f9f9-f9f9-4f9f-8f9f-f9f9f9f9f008',
    'План обеспечения населения Усть-Каменогорска социальным углём',
    30000, 'т',
    DATE '2026-01-01', DATE '2027-12-31',
    '11111111-1111-4111-8111-111111111033',
    'plan', true, true, false,
    'Меморандум, отопительный сезон 2026–2027. Не price observation.'
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

DO $$
DECLARE
  n integer;
  astana_latest integer;
  with_stock integer;
BEGIN
  SELECT COUNT(*) INTO n FROM public.retail_coal_observations WHERE is_verified AND is_published;
  IF n <> 30 THEN
    RAISE EXCEPTION 'Этап 9A.1: ожидалось 30 retail observations, получено %.', n;
  END IF;
  SELECT COUNT(*) INTO astana_latest
  FROM public.retail_coal_observations
  WHERE publication_url LIKE '%/1291905%' AND price IN (19500, 18800, 16800);
  IF astana_latest <> 3 THEN
    RAISE EXCEPTION 'Этап 9A: не найдены 3 latest Astana rows 19500/18800/16800 в новой таблице.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.prices
    WHERE id IN (
      '99999999-9999-4999-8999-999999990010',
      '99999999-9999-4999-8999-999999990011',
      '99999999-9999-4999-8999-999999990012'
    )
  ) THEN
    RAISE EXCEPTION 'Этап 9A: retail UUIDs попали в prices.';
  END IF;
  SELECT COUNT(*) INTO with_stock FROM public.retail_coal_observations WHERE stock_tonnes IS NOT NULL;
  IF with_stock <> 15 THEN
    RAISE EXCEPTION 'Этап 9A: ожидалось 15 rows со stock_tonnes, получено %.', with_stock;
  END IF;
  IF (
    SELECT COUNT(*) FROM public.retail_coal_observations
    WHERE publication_url LIKE '%/1254435%'
  ) <> 3 THEN
    RAISE EXCEPTION 'Этап 9A.1: ожидалось 3 Ust-Kamenogorsk 2026 rows.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.retail_coal_observations
    WHERE observation_date >= DATE '2026-01-01'
      AND publication_url NOT LIKE '%/1254435%'
  ) THEN
    RAISE EXCEPTION 'Этап 9A.1: observation_date 2026 появилась у не-2026 среза.';
  END IF;
END $$;

COMMIT;
