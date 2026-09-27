-- generated counts: total=102 fy=64 (nat 3 partner 61) ytd2025=17 ytd2026=21
-- Seed этапа 5B: экспорт HS 2701 (Comtrade full year + БНС YTD).
-- Не DELETE. Не ослабляет RLS. Не выдаёт Comtrade за XLSX БНС.
-- Ministry 30 млн т (id …001) не перезаписывается объёмом: только notes/scope.
-- Объёмы HS — тонны; стоимость — USD (thousand USD × 1000).
-- Не запускается из приложения.
-- Явная транзакция: ошибка в любом statement откатывает весь seed.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trade' AND column_name = 'hs_code'
  ) THEN
    RAISE EXCEPTION 'Этап 5: нет trade.hs_code. Сначала migration 20260925210000_phase5_companies_exports.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.trade
    WHERE id = '77777777-7777-4777-8777-777777777001' AND volume = 30 AND trade_type = 'export'
  ) THEN
    RAISE EXCEPTION 'Этап 5: не найдена неизменная строка Минэнерго экспорт 30 млн т (id …001).';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.trade
    WHERE id = '77777777-7777-4777-8777-777777777002' AND volume = 85 AND trade_type = 'domestic_supply'
  ) THEN
    RAISE EXCEPTION 'Этап 5: не найдена неизменная строка внутреннее направление 85 млн т (id …002).';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sources
    WHERE id = '11111111-1111-4111-8111-111111111014'
      AND code IS DISTINCT FROM 'unComtradeKazHs2701'
  ) THEN
    RAISE EXCEPTION 'Этап 5: UUID source …014 занят другой записью.';
  END IF;
END $$;

INSERT INTO public.sources (
  id, code, organization, publication_title, url, source_type,
  published_at, retrieved_at, notes, is_published
) VALUES
  (
    '11111111-1111-4111-8111-111111111014',
    'unComtradeKazHs2701',
    'UN Comtrade / национальная отчётность Казахстана',
    'UN Comtrade: Kazakhstan reporter, flow export, HS 2701, annual 2023–2025',
    'https://comtradeplus.un.org/',
    'official',
    NULL,
    DATE '2026-09-25',
    'National reporting for Kazakhstan. Не извлечено из XLSX БНС. БНС остаётся основным статистическим контекстом Казахстана как отдельный источник. HS 2701 only; 2702/2703/2704 не включены.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111015',
    'bnsTradeYtd2026',
    'Бюро национальной статистики Республики Казахстан',
    'Экспорт и импорт товаров РК по 4,6,10 знакам ТН ВЭД ЕАЭС (январь-июль 2026г.)',
    'https://stat.gov.kz/api/iblock/element/347930/file/ru/',
    'official',
    DATE '2026-09-15',
    DATE '2026-09-25',
    'Официальный файл БНС, element 347930, дата публикации 15.09.2026. Использован лист «4 знака ТН ВЭД», код 2701. Единицы источника: нетто-тонны и тыс. USD. Не суммировать 6/10-значные подкоды поверх 2701.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111016',
    'bnsTradeYtd2025Wayback',
    'Бюро национальной статистики Республики Казахстан (архивная копия публикации)',
    'Экспорт и импорт товаров РК по 4 знакам ТН ВЭД: месячные таблицы январь–июль 2025 (element 335723)',
    'https://web.archive.org/web/20251023044007/https://stat.gov.kz/api/iblock/element/335723/file/ru/',
    'official',
    DATE '2025-08-01',
    DATE '2026-09-25',
    'Live element 335723 недоступен. Значение Jan–Jul 2025 восстановлено суммированием семи официальных месячных таблиц tab_21_00.xls из RAR официального распространения БНС (Wayback 20251023044007). НЕ одна YTD-колонка XLSX.',
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

UPDATE public.trade
SET
  reporter = 'Kazakhstan',
  flow = 'export',
  measure_kind = 'actual',
  is_full_year = true,
  methodology_scope = 'ministry_coal_exports',
  series_code = 'ministry_coal_exports',
  observation_scope = 'national',
  hs_code = NULL,
  partner_code = NULL,
  declared_partner_may_be_transit = false,
  notes = 'Официальный показатель Минэнерго: экспорт угля 2025 = 30 млн т (gov.kz 1221846). Хранится ОТДЕЛЬНО от HS 2701 full-year 2025 = 29,419 млн т. Не распределять 30 млн т по странам. Не складывать 2701+2702, чтобы получить 30. Различие методологии/охвата не подтверждено полностью.'
WHERE id = '77777777-7777-4777-8777-777777777001'
  AND volume = 30;

UPDATE public.trade
SET
  reporter = 'Kazakhstan',
  flow = 'domestic_supply',
  measure_kind = 'actual',
  is_full_year = true,
  methodology_scope = NULL,
  series_code = 'ministry_domestic_supply',
  observation_scope = 'national'
WHERE id = '77777777-7777-4777-8777-777777777002'
  AND volume = 85;

INSERT INTO public.trade (
  id, trade_type, destination_country, volume, volume_unit, value_amount, currency,
  period_start, period_end, source_id, data_status, is_verified, is_published, notes,
  reporter, hs_code, flow, measure_kind, is_full_year, declared_partner_may_be_transit,
  methodology_scope, series_code, partner_code, observation_scope
) VALUES
(
    '77777777-7777-4777-8777-000000000100',
    'export', NULL, 28544000, 'т', 707530000, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'Kazakhstan reporter, flow export, HS 2701, full year. UN Comtrade national reporting. Объём 28.544 млн т и стоимость 707.53 млн USD сохранены с точностью публикации исследования (не искусственное уточнение). Comtrade API World netWgt/FOB: 28544458.589 t / 707532085.38 USD — не подменяет округлённый ряд и не выдаётся за извлечённый XLSX БНС. БНС — отдельный статистический контекст Казахстана. Не смешивать с Минэнерго 30 млн т 2025.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', NULL, 'national'
  ),
  (
    '77777777-7777-4777-8777-000000000101',
    'export', NULL, 27785000, 'т', 602980000, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'Kazakhstan reporter, flow export, HS 2701, full year. UN Comtrade national reporting. Объём 27.785 млн т и стоимость 602.98 млн USD сохранены с точностью публикации исследования (не искусственное уточнение). Comtrade API World netWgt/FOB: 27784779.96 t / 602983496.7 USD — не подменяет округлённый ряд и не выдаётся за извлечённый XLSX БНС. БНС — отдельный статистический контекст Казахстана. Не смешивать с Минэнерго 30 млн т 2025.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', NULL, 'national'
  ),
  (
    '77777777-7777-4777-8777-000000000102',
    'export', NULL, 29419000, 'т', 611150000, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'Kazakhstan reporter, flow export, HS 2701, full year. UN Comtrade national reporting. Объём 29.419 млн т и стоимость 611.15 млн USD сохранены с точностью публикации исследования (не искусственное уточнение). Comtrade API World netWgt/FOB: 29419422.695 t / 611150729.82 USD — не подменяет округлённый ряд и не выдаётся за извлечённый XLSX БНС. БНС — отдельный статистический контекст Казахстана. Не смешивать с Минэнерго 30 млн т 2025.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', NULL, 'national'
  ),
  (
    '77777777-7777-4777-8777-000000000103',
    'export', 'Belgium', 36733.6, 'т', 7441249.73, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Belgium (code 56). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'belgium', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000104',
    'export', 'India', 441581, 'т', 12132003.54, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade partnerAreas: code 699 = India (current, с 1975). Code 356 = India (...1974), historical; для 2023–2025 не используется. Не смешивать с 490 Other Asia, nes. UN Comtrade KZ export HS 2701, partner India (code 699). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'india', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000105',
    'export', 'Spain', 36141, 'т', 433692, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Spain (code 724). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'spain', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000106',
    'export', 'Indonesia', 120327, 'т', 3247942.31, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Indonesia (code 360). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'indonesia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000107',
    'export', 'Israel', 278794.88, 'т', 6424369.74, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Israel (code 376). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'israel', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000108',
    'export', 'Italy', 96973.9, 'т', 11197008.45, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Italy (code 380). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'italy', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000109',
    'export', 'Croatia', 414, 'т', 5394.42, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Croatia (code 191). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'croatia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000110',
    'export', 'Morocco', 204998.3, 'т', 4485128.52, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Morocco (code 504). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'morocco', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000111',
    'export', 'Netherlands', 45060.9, 'т', 6219985.81, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Netherlands (code 528). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'netherlands', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000112',
    'export', 'Estonia', 545838.5, 'т', 45447679.54, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Estonia (code 233). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'estonia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000113',
    'export', 'Latvia', 2289633, 'т', 74996169.76, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Latvia (code 428). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'latvia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000114',
    'export', 'Lithuania', 78146.5, 'т', 3296136.29, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Lithuania (code 440). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'lithuania', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000115',
    'export', 'Czechia', 138072, 'т', 7412492.49, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Czechia (code 203). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'czechia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000116',
    'export', 'Poland', 2762731.5, 'т', 216352749.69, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Poland (code 616). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'poland', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000117',
    'export', 'Georgia', 2552.8, 'т', 199509.7, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Georgia (code 268). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'georgia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000118',
    'export', 'Germany', 101205.8, 'т', 9794545.6, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Germany (code 276). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'germany', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000119',
    'export', 'Turkey', 951957.21, 'т', 32319001.06, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Turkey (code 792). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'turkey', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000120',
    'export', 'China', 763261.4, 'т', 28094390.26, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner China (code 156). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'china', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000121',
    'export', 'Uzbekistan', 1308861.4, 'т', 34054468.18, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Uzbekistan (code 860). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'uzbekistan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000122',
    'export', 'Kyrgyzstan', 1340056, 'т', 49298827.93, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Kyrgyzstan (code 417). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'kyrgyzstan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000123',
    'export', 'Russia', 16933763.8, 'т', 146491054.46, 'USD',
    DATE '2023-01-01', DATE '2023-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Russia (code 643). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'russia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000124',
    'export', 'Belgium', 61000, 'т', 10305968.25, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Belgium (code 56). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'belgium', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000125',
    'export', 'China', 522515.6, 'т', 20684813.19, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner China (code 156). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'china', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000126',
    'export', 'Croatia', 65844, 'т', 985684.68, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Croatia (code 191). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'croatia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000127',
    'export', 'Estonia', 97433.2, 'т', 9290917.94, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Estonia (code 233). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'estonia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000128',
    'export', 'Georgia', 3011.55, 'т', 332776.28, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Georgia (code 268). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'georgia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000129',
    'export', 'Germany', 6600, 'т', 113190, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Germany (code 276). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'germany', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000130',
    'export', 'Israel', 679989, 'т', 10991638.89, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Israel (code 376). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'israel', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000131',
    'export', 'Italy', 305290.8, 'т', 55347020.1, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Italy (code 380). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'italy', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000132',
    'export', 'Kyrgyzstan', 774819, 'т', 30440723.3, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Kyrgyzstan (code 417). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'kyrgyzstan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000133',
    'export', 'Latvia', 1198420, 'т', 17882301.18, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Latvia (code 428). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'latvia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000134',
    'export', 'Lithuania', 120563.7, 'т', 4732595.97, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Lithuania (code 440). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'lithuania', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000135',
    'export', 'Malaysia', 16938, 'т', 271197, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Malaysia (code 458). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'malaysia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000136',
    'export', 'Morocco', 787164, 'т', 12311370.98, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Morocco (code 504). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'morocco', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000137',
    'export', 'Netherlands', 298212, 'т', 45684016.52, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Netherlands (code 528). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'netherlands', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000138',
    'export', 'Poland', 2834018.9, 'т', 157920694.17, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Poland (code 616). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'poland', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000139',
    'export', 'Russia', 16868052.3, 'т', 154787821.74, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Russia (code 643). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'russia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000140',
    'export', 'India', 819540, 'т', 13616835.53, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade partnerAreas: code 699 = India (current, с 1975). Code 356 = India (...1974), historical; для 2023–2025 не используется. Не смешивать с 490 Other Asia, nes. UN Comtrade KZ export HS 2701, partner India (code 699). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'india', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000141',
    'export', 'Spain', 132470, 'т', 1979665.32, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Spain (code 724). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'spain', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000142',
    'export', 'UAE', 3952.26, 'т', 316180.8, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner UAE (code 784). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'uae', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000143',
    'export', 'Turkey', 1044928.5, 'т', 20453103.47, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Turkey (code 792). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'turkey', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000144',
    'export', 'Uzbekistan', 1091149.45, 'т', 26276383.84, 'USD',
    DATE '2024-01-01', DATE '2024-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Uzbekistan (code 860). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'uzbekistan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000145',
    'export', 'Croatia', 33645.056, 'т', 433110.27, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Croatia (code 191). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'croatia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000146',
    'export', 'Morocco', 95018, 'т', 1948514.52, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Morocco (code 504). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'morocco', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000147',
    'export', 'Israel', 77870, 'т', 1481783.9, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Israel (code 376). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'israel', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000148',
    'export', 'Italy', 274287, 'т', 49061444.09, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Italy (code 380). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'italy', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000149',
    'export', 'Brazil', 72531.146, 'т', 884049.79, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Brazil (code 76). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'brazil', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000150',
    'export', 'India', 1290389.373, 'т', 23949948.13, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade partnerAreas: code 699 = India (current, с 1975). Code 356 = India (...1974), historical; для 2023–2025 не используется. Не смешивать с 490 Other Asia, nes. UN Comtrade KZ export HS 2701, partner India (code 699). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'india', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000151',
    'export', 'Latvia', 637104.392, 'т', 8592124.72, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Latvia (code 428). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'latvia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000152',
    'export', 'Lithuania', 87826.9, 'т', 2485015.4, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Lithuania (code 440). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'lithuania', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000153',
    'export', 'Poland', 4818122.994, 'т', 239126090.52, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Poland (code 616). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'poland', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000154',
    'export', 'Malaysia', 1133106.194, 'т', 15223120.31, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Malaysia (code 458). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'malaysia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000155',
    'export', 'Netherlands', 376768.25, 'т', 6025123.35, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Netherlands (code 528). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'netherlands', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000156',
    'export', 'UAE', 27897, 'т', 446352, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner UAE (code 784). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=true: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, true,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'uae', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000157',
    'export', 'Georgia', 27894.9, 'т', 976321.5, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Georgia (code 268). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'georgia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000158',
    'export', 'Turkey', 1481529.106, 'т', 26090341.25, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Turkey (code 792). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'turkey', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000159',
    'export', 'Azerbaijan', 339.1, 'т', 45778.5, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Azerbaijan (code 31). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'azerbaijan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000160',
    'export', 'China', 1022445.35, 'т', 17370685.04, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner China (code 156). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'china', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000161',
    'export', 'Uzbekistan', 908059.308, 'т', 19347420.47, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Uzbekistan (code 860). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'uzbekistan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000162',
    'export', 'Kyrgyzstan', 743978.15, 'т', 31360754.95, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Kyrgyzstan (code 417). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'kyrgyzstan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000163',
    'export', 'Russia', 16159973.857, 'т', 164355663.46, 'USD',
    DATE '2025-01-01', DATE '2025-12-31', '11111111-1111-4111-8111-111111111014',
    'official', true, true, 'UN Comtrade KZ export HS 2701, partner Russia (code 643). netWgt kg/1000 = tonnes. Отсутствие строки в другом году ≠ 0. declared_partner_may_be_transit=false: декларируемая страна-партнёр может не отражать конечного потребителя; транзит не доказан.',
    'Kazakhstan', '2701', 'export', 'actual', true, false,
    'hs_2701_comtrade', 'hs2701_comtrade_fy', 'russia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000164',
    'export', NULL, 17205847.2546, 'т', 419880401.87, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС, лист «4 знака ТН ВЭД», код 2701, январь–июль 2026. Файл element 347930, publication 15.09.2026. Source units: net tonnes и thousand USD; trade_value_usd = 419880.40187 * 1000 = 419880401.87. Не сумма 6/10-значных подкодов. measure_kind=ytd_actual, is_full_year=false. Не YoY против full-year 2025.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', NULL, 'national'
  ),
  (
    '77777777-7777-4777-8777-000000000165',
    'export', 'Russia', 8742170.668, 'т', 139684280.5, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 139684.2805 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'russia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000166',
    'export', 'Poland', 2890991.235, 'т', 147109313.43, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 147109.31343 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'poland', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000167',
    'export', 'Turkey', 2025431.913, 'т', 38166708.93, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 38166.70893 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'turkey', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000168',
    'export', 'Malaysia', 900167.302, 'т', 14322025.63, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 14322.02563 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'malaysia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000169',
    'export', 'Uzbekistan', 787483.15, 'т', 18048548.57, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 18048.54857 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'uzbekistan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000170',
    'export', 'Netherlands', 579694.2, 'т', 25106787.18, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 25106.78718 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'netherlands', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000171',
    'export', 'India', 276649.417, 'т', 5549058.87, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 5549.05887 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'india', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000172',
    'export', 'China', 240543.4116, 'т', 4526723.99, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 4526.72399 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'china', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000173',
    'export', 'Kyrgyzstan', 222179.5, 'т', 10351006.55, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 10351.00655 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'kyrgyzstan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000174',
    'export', 'Germany', 149165.05, 'т', 1989535.8, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 1989.5358 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'germany', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000175',
    'export', 'Israel', 79598.94, 'т', 1210324.52, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 1210.32452 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'israel', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000176',
    'export', 'Taiwan (China)', 70542.436, 'т', 1065190.78, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 1065.19078 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'taiwan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000177',
    'export', 'Croatia', 64113.624, 'т', 1366422.32, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 1366.42232 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'croatia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000178',
    'export', 'Italy', 56836.95, 'т', 8014009.95, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 8014.00995 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'italy', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000179',
    'export', 'Lithuania', 55863, 'т', 1767587.5, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 1767.5875 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'lithuania', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000180',
    'export', 'Georgia', 29986.4, 'т', 1049524, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 1049.524 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'georgia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000181',
    'export', 'Latvia', 28661.5, 'т', 358802.96, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 358.80296 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'latvia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000182',
    'export', 'Indonesia', 3588, 'т', 72513.48, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 72.51348 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'indonesia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000183',
    'export', 'Azerbaijan', 1457.05, 'т', 107566.75, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 107.56675 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'azerbaijan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000184',
    'export', 'Iran, Islamic Republic', 723.508, 'т', 14470.16, 'USD',
    DATE '2026-01-01', DATE '2026-07-31', '11111111-1111-4111-8111-111111111015',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2026, element 347930. Стоимость: 14.47016 thousand USD → USD ×1000. Страны с нулевым экспортом не seed. Сумма partner tonnes = national 17205847.2546.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'iran', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000185',
    'export', NULL, 15689891.1, 'т', 296901271.63, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'Сопоставимый Jan–Jul 2025. НЕ одна YTD-колонка XLSX. Live BNS element 335723 недоступен. Официальная публикация восстановлена из архивной копии BNS distribution: Wayback snapshot 20251023044007, element 335723. Внутри официального BNS RAR — месячные таблицы January–July 2025; для 4-digit TN VED использованы tab_21_00.xls за каждый месяц. Итог = сумма семи официальных месячных observations.',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', NULL, 'national'
  ),
  (
    '77777777-7777-4777-8777-000000000186',
    'export', 'Russia', 9894629.78, 'т', 99479836.74, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'russia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000187',
    'export', 'Poland', 1887483.498, 'т', 94307990.57, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'poland', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000188',
    'export', 'Turkey', 1182016.236, 'т', 21378585.41, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'turkey', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000189',
    'export', 'Malaysia', 156378.4, 'т', 2658205.54, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'malaysia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000190',
    'export', 'Uzbekistan', 362249.5, 'т', 7936937.75, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'uzbekistan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000191',
    'export', 'Netherlands', 73199, 'т', 1056013.46, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'netherlands', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000192',
    'export', 'India', 904395.178, 'т', 18823693.49, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'india', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000193',
    'export', 'China', 256565.366, 'т', 7558471.17, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'china', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000194',
    'export', 'Kyrgyzstan', 270609.4, 'т', 11967556.98, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'kyrgyzstan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000195',
    'export', 'Israel', 77870, 'т', 1481783.9, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'israel', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000196',
    'export', 'Taiwan (China)', 59685, 'т', 791074.65, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'taiwan', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000197',
    'export', 'Italy', 121603.95, 'т', 21907990.99, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'italy', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000198',
    'export', 'Lithuania', 47210.4, 'т', 1254986.9, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'lithuania', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000199',
    'export', 'Latvia', 273149.392, 'т', 3904384.32, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'latvia', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000200',
    'export', 'Morocco', 94949, 'т', 1947407.76, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, false,
    'hs_2701_bns', 'hs2701_bns_ytd', 'morocco', 'partner'
  ),
  (
    '77777777-7777-4777-8777-000000000201',
    'export', 'UAE', 27897, 'т', 446352, 'USD',
    DATE '2025-01-01', DATE '2025-07-31', '11111111-1111-4111-8111-111111111016',
    'official', true, true, 'БНС 4-digit TN VED 2701, янв–июл 2025: сумма семи месячных tab_21_00.xls из архива element 335723 (Wayback 20251023044007). Не одна YTD-колонка. Germany/Croatia/Georgia/Indonesia/Azerbaijan/Iran: нет экспортной observation — строки не создаются (не fake 0).',
    'Kazakhstan', '2701', 'export', 'ytd_actual', false, true,
    'hs_2701_bns', 'hs2701_bns_ytd', 'uae', 'partner'
  )
ON CONFLICT (id) DO UPDATE SET
  trade_type = EXCLUDED.trade_type,
  destination_country = EXCLUDED.destination_country,
  volume = EXCLUDED.volume,
  volume_unit = EXCLUDED.volume_unit,
  value_amount = EXCLUDED.value_amount,
  currency = EXCLUDED.currency,
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  source_id = EXCLUDED.source_id,
  data_status = EXCLUDED.data_status,
  is_verified = EXCLUDED.is_verified,
  is_published = EXCLUDED.is_published,
  notes = EXCLUDED.notes,
  reporter = EXCLUDED.reporter,
  hs_code = EXCLUDED.hs_code,
  flow = EXCLUDED.flow,
  measure_kind = EXCLUDED.measure_kind,
  is_full_year = EXCLUDED.is_full_year,
  declared_partner_may_be_transit = EXCLUDED.declared_partner_may_be_transit,
  methodology_scope = EXCLUDED.methodology_scope,
  series_code = EXCLUDED.series_code,
  partner_code = EXCLUDED.partner_code,
  observation_scope = EXCLUDED.observation_scope;

INSERT INTO public.data_imports (
  id, source_id, imported_at, import_type, status, records_count, notes
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa16',
  '11111111-1111-4111-8111-111111111015',
  TIMESTAMPTZ '2026-09-25 00:00:00+00',
  'manual_seed',
  'completed',
  102,
  'Этап 5B. sources 3; trade observations 102: Comtrade FY 64; BNS YTD 2025 17; BNS YTD 2026 21. Министерство 30 млн т не включено в этот count (update существующей строки). Не включены 2702/2703/2704; fake zero partners; Malaysia 2023 ~0. Строка data_imports в records_count не входит.'
)
ON CONFLICT (id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  imported_at = EXCLUDED.imported_at,
  import_type = EXCLUDED.import_type,
  status = EXCLUDED.status,
  records_count = EXCLUDED.records_count,
  notes = EXCLUDED.notes;

COMMIT;
