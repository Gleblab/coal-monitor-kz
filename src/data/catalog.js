import { INDICATOR_STATUS, sources } from './sources'

/**
 * Каталог только тех показателей, которые заданы официальными публикациями.
 * Отсутствующие срезы не досчитываются и не заполняются моделью.
 *
 * Числовые поля — ожидаемые значения для сверки remote match и metadata (подписи, search).
 * Не использовать как silent runtime fallback вместо Supabase / verified payload.
 */

export const regions = [
  { id: 'all', name: 'Все регионы / республика' },
  { id: 'astana', name: 'г. Астана' },
  { id: 'almaty-city', name: 'г. Алматы' },
  { id: 'shymkent', name: 'г. Шымкент' },
  { id: 'abai', name: 'Область Абай' },
  { id: 'akmola', name: 'Акмолинская область' },
  { id: 'aktobe', name: 'Актюбинская область' },
  { id: 'almaty', name: 'Алматинская область' },
  { id: 'atyrau', name: 'Атырауская область' },
  { id: 'east-kazakhstan', name: 'Восточно-Казахстанская область' },
  { id: 'zhambyl', name: 'Жамбылская область' },
  { id: 'west-kazakhstan', name: 'Западно-Казахстанская область' },
  { id: 'jetisu', name: 'область Жетісу' },
  { id: 'karaganda', name: 'Карагандинская область' },
  { id: 'kostanay', name: 'Костанайская область' },
  { id: 'kyzylorda', name: 'Кызылординская область' },
  { id: 'mangystau', name: 'Мангистауская область' },
  { id: 'pavlodar', name: 'Павлодарская область' },
  { id: 'north-kazakhstan', name: 'Северо-Казахстанская область' },
  { id: 'turkistan', name: 'Туркестанская область' },
  { id: 'ulytau', name: 'Область Улытау' },
]

export const coalTypes = [
  { id: 'all', name: 'Все сегменты' },
  { id: 'household', name: 'Коммунально-бытовой уголь' },
  { id: 'energy', name: 'Энергетический уголь' },
  { id: 'power', name: 'Уголь для энергопроизводящих организаций' },
  { id: 'industrial', name: 'Уголь для промышленных нужд' },
]

/** Секторы ТЭБ БНС для /energy-role. Не равны сегментам АЗРК (coalTypes). */
export const energySectors = [
  { id: 'all', name: 'Все сегменты' },
  { id: 'industry', name: 'Промышленность' },
  { id: 'transport', name: 'Транспорт' },
  { id: 'residential', name: 'Жилищный сектор' },
  { id: 'commercial', name: 'Коммерция и услуги' },
  { id: 'agri_forestry_fishing', name: 'Сельское и рыбное' },
  { id: 'other_unspecified', name: 'Другие / не указанные' },
]

export const ENERGY_ROLE_SECTOR_IDS = new Set(
  energySectors.filter((item) => item.id !== 'all').map((item) => item.id),
)

function indicator(partial) {
  return {
    coverage: 'republic',
    segments: ['all'],
    regions: ['all'],
    methodology: null,
    ...partial,
  }
}

export const kpis = [
  indicator({
    id: 'production2025',
    label: 'Добыча угля',
    value: 115,
    unit: 'млн т',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
    note: 'Фактический отраслевой итог, опубликованный Министерством энергетики РК. Не является показателем статистического счета БНС.',
  }),
  indicator({
    id: 'export2025',
    label: 'Экспорт',
    value: 30,
    unit: 'млн т',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
    note: 'Объём, направленный на экспорт, по сообщению Министерства энергетики РК.',
  }),
  indicator({
    id: 'domestic2025',
    label: 'Внутреннее направление',
    value: 85,
    unit: 'млн т',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
    note: 'Направлено на внутреннее потребление и коммунально-бытовые нужды. Это формулировка источника, а не расчётный остаток.',
  }),
  indicator({
    id: 'plan2026',
    label: 'План добычи',
    value: 128.9,
    display: '128,9',
    unit: 'млн т',
    period: '2026 год (план)',
    status: INDICATOR_STATUS.plan,
    sourceId: 'minenergo2025',
    note: 'Плановый показатель. Не является фактической добычей 2026 года.',
  }),
  indicator({
    id: 'bnsReserves',
    label: 'Запасы угля, статистический учет БНС',
    value: 28.7185,
    display: '28,7185',
    altDisplay: '28 718,5 млн т',
    unit: 'млрд т',
    period: 'На конец 2024 года',
    status: INDICATOR_STATUS.official,
    sourceId: 'bnsReserves2024',
    note: 'Статистический учет запасов БНС, конец 2024 года. Не смешивать с отраслевой оценкой Министерства энергетики.',
  }),
  indicator({
    id: 'subsoilUsers',
    label: 'Недропользователи, добыча угля',
    value: 40,
    unit: 'ед.',
    period: 'По состоянию, указанному в сообщении Минэнерго (итоги 2025 года)',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
    note: 'Количество недропользователей, осуществляющих добычу угля, по данным Министерства энергетики РК.',
  }),
]

export const reserveAccounts = [
  indicator({
    id: 'bnsReservesDetail',
    title: 'Статистический учет запасов БНС, конец 2024 года',
    value: 28.7185,
    display: '28,7185 млрд т',
    altDisplay: '28 718,5 млн т',
    unit: 'млрд т',
    period: 'На конец 2024 года',
    status: INDICATOR_STATUS.official,
    sourceId: 'bnsReserves2024',
    methodology:
      'Показатель публикуется в счете минеральных и энергетических ресурсов БНС. Это статистический учет запасов, а не отраслевая оценка Минэнерго.',
  }),
  indicator({
    id: 'minenergoReserves',
    title: 'Отраслевая оценка, Министерство энергетики РК',
    value: 33.6,
    display: '33,6 млрд т',
    unit: 'млрд т',
    period: 'Оценка, приведенная в сообщении об итогах 2025 года',
    status: INDICATOR_STATUS.industry,
    sourceId: 'minenergo2025',
    methodology:
      'Отраслевая оценка общего объёма запасов. Министерство энергетики указывает, что при текущих объёмах добычи этих ресурсов достаточно более чем на 300 лет. Показатель не усредняется со счетом БНС.',
  }),
]

export const extractionAccounts = [
  indicator({
    id: 'bnsExtraction2024',
    title: 'Добыча угля в статистическом счете БНС',
    value: 90.2,
    unit: 'млн т',
    period: '2024 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'bnsReserves2024',
    methodology:
      'Это добыча в рамках статистического счета минеральных и энергетических ресурсов за 2024 год. Показатель нельзя автоматически сопоставлять с 115 млн т Министерства энергетики за 2025 год: различаются год, ведомство и методология учета.',
  }),
  indicator({
    id: 'minenergoExtraction2025',
    title: 'Добыча угля, Министерство энергетики РК',
    value: 115,
    unit: 'млн т',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
    methodology:
      'Отраслевой итог за 2025 год. Не заменяет показатель 90,2 млн т из счета БНС за 2024 год.',
  }),
]

export const flow2025 = [
  indicator({
    id: 'domesticFlow',
    label: 'Внутреннее потребление и коммунально-бытовые нужды',
    value: 85,
    unit: 'млн т',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
  }),
  indicator({
    id: 'exportFlow',
    label: 'Экспорт',
    value: 30,
    unit: 'млн т',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
  }),
]

export const investments = [
  indicator({
    id: 'invest2025',
    label: 'Инвестиции в отрасль',
    value: 305,
    unit: 'млрд тенге',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'minenergo2025',
  }),
  indicator({
    id: 'invest2026',
    label: 'Ожидаемые инвестиции',
    value: 553,
    approx: true,
    unit: 'млрд тенге',
    period: '2026 год (ожидание)',
    status: 'ОЖИДАНИЕ',
    sourceId: 'minenergo2025',
    note: 'В источнике указано «около 553 млрд тенге». Это ожидание, а не исполненный факт.',
  }),
]

export const concentration = [
  {
    id: 'householdShare',
    segment: 'Коммунально-бытовой уголь',
    segmentId: 'household',
    actors: 'ERG + АО «Каражыра»',
    values: [
      { year: 2024, value: 74.8 },
      { year: 2025, value: 67.9 },
    ],
    unit: '%',
    status: INDICATOR_STATUS.official,
    sourceId: 'azrkConcentration',
    scope:
      'Доли крупнейших участников соответствующих сегментов рынка первичной оптовой реализации угля. Не являются долями всего угольного рынка Казахстана.',
  },
  {
    id: 'powerShare',
    segment: 'Уголь для нужд энергопроизводящих организаций',
    segmentId: 'power',
    actors: 'ТОО «Богатырь Комир» + ТОО «Kazakhmys Coal»',
    values: [
      { year: 2024, value: 84.1 },
      { year: 2025, value: 81.6 },
    ],
    unit: '%',
    status: INDICATOR_STATUS.official,
    sourceId: 'azrkConcentration',
    scope:
      'Доли крупнейших участников соответствующих сегментов рынка первичной оптовой реализации угля. Не являются долями всего угольного рынка Казахстана.',
  },
  {
    id: 'industrialShare',
    segment: 'Уголь для промышленных нужд',
    segmentId: 'industrial',
    actors: 'группа ERG',
    values: [
      { year: 2024, value: 62.3 },
      { year: 2025, value: 69.1 },
    ],
    unit: '%',
    status: INDICATOR_STATUS.official,
    sourceId: 'azrkConcentration',
    scope:
      'Доли крупнейших участников соответствующих сегментов рынка первичной оптовой реализации угля. Не являются долями всего угольного рынка Казахстана.',
  },
]

export const priceGrowth = [
  {
    id: 'householdPriceGrowth',
    segment: 'Коммунально-бытовой уголь',
    segmentId: 'household',
    period: '2022–2025 годы',
    display: 'рост порядка 30–35%',
    min: 30,
    max: 35,
    exact: false,
    unit: '%',
    status: INDICATOR_STATUS.official,
    sourceId: 'azrkConcentration',
    note: 'Накопленный рост цен первичной оптовой реализации за период 2022–2025 гг. Это не годовой темп и не цена за тонну.',
  },
  {
    id: 'energyPriceGrowth',
    segment: 'Энергетический уголь',
    segmentId: 'energy',
    period: '2022–2025 годы',
    display: 'рост около 45%',
    min: 45,
    max: 45,
    exact: false,
    unit: '%',
    status: INDICATOR_STATUS.official,
    sourceId: 'azrkConcentration',
    note: 'Накопленный рост цен первичной оптовой реализации за период 2022–2025 гг. Это не годовой темп и не цена за тонну.',
  },
]

export const astanaRetailPrices = [
  indicator({
    id: 'astanaShubarkul',
    product: 'Шубаркуль',
    value: 19500,
    unit: 'тенге/тонна',
    period: 'Значение из официального сообщения акимата г. Астаны',
    status: INDICATOR_STATUS.regional,
    sourceId: 'astanaAkimat',
    regions: ['all', 'astana'],
    coverage: 'astana',
    note: 'Средние розничные цены в г. Астана. Не являются средними ценами по Республике Казахстан.',
  }),
  indicator({
    id: 'astanaKarazhyra',
    product: 'Каражыра',
    value: 18800,
    unit: 'тенге/тонна',
    period: 'Значение из официального сообщения акимата г. Астаны',
    status: INDICATOR_STATUS.regional,
    sourceId: 'astanaAkimat',
    regions: ['all', 'astana'],
    coverage: 'astana',
    note: 'Средние розничные цены в г. Астана. Не являются средними ценами по Республике Казахстан.',
  }),
  indicator({
    id: 'astanaMaykuba',
    product: 'Майкуба',
    value: 16800,
    unit: 'тенге/тонна',
    period: 'Значение из официального сообщения акимата г. Астаны',
    status: INDICATOR_STATUS.regional,
    sourceId: 'astanaAkimat',
    regions: ['all', 'astana'],
    coverage: 'astana',
    note: 'Средние розничные цены в г. Астана. Не являются средними ценами по Республике Казахстан.',
  }),
]

export const energyRole = [
  indicator({
    id: 'primaryShare2025',
    label: 'Доля угля в общем первичном потреблении энергии',
    value: 45.4,
    display: '45,4',
    unit: '%',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'bnsTeb2025',
    note: 'Показатель общего первичного потребления энергии. Не смешивать с долей угля в конечном потреблении (13,3%).',
  }),
  indicator({
    id: 'finalShare2025',
    label: 'Доля угля в конечном потреблении энергии',
    value: 13.3,
    display: '13,3',
    unit: '%',
    period: '2025 год',
    status: INDICATOR_STATUS.official,
    sourceId: 'bnsTeb2025',
    note: 'Показатель конечного потребления энергии. Не смешивать с долей угля в общем первичном потреблении (45,4%).',
  }),
]

export const energyRoleQuote =
  'Уголь занимает наибольшую долю в структуре общего первичного потребления энергии Казахстана — 45,4% по итогам 2025 года.'

const unconfirmedReserves = {
  display: '—',
  title: 'Сопоставимые подтвержденные данные пока отсутствуют',
}

export const coalAssets = [
  {
    id: 'ekibastuz-basin',
    name: 'Экибастузский угольный бассейн',
    objectType: 'угольный бассейн',
    regionId: 'pavlodar',
    region: 'Павлодарская область',
    operator: 'ТОО «Богатырь Комир» (ключевой оператор)',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy', 'power'],
    reserves: unconfirmedReserves,
    capacity: { display: '—', title: 'Сопоставимые подтвержденные данные пока отсутствуют' },
    sourceId: 'bogatyrKomir',
    status: INDICATOR_STATUS.company,
    note: 'Цифра 2,62 млрд т относится к балансовым запасам ТОО «Богатырь Комир», а не к запасам всего Экибастузского бассейна.',
  },
  {
    id: 'bogatyr-company',
    name: 'ТОО «Богатырь Комир»',
    objectType: 'разрез/предприятие',
    regionId: 'pavlodar',
    region: 'Павлодарская область',
    operator: 'ТОО «Богатырь Комир»',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy', 'power'],
    reserves: {
      display: '2,62 млрд т',
      title: 'Балансовые запасы ТОО «Богатырь Комир». Не являются запасами всего Экибастузского бассейна.',
    },
    capacity: {
      display: '42 млн т в год',
      title: 'Производственная мощность предприятия, не фактическая добыча за год.',
    },
    sourceId: 'bogatyrKomir',
    status: INDICATOR_STATUS.company,
    note: 'Балансовые запасы ТОО «Богатырь Комир». Производственная мощность предприятия: 42 млн т угля в год.',
  },
  {
    id: 'bogatyr-pit',
    name: 'Разрез «Богатырь»',
    objectType: 'разрез/предприятие',
    regionId: 'pavlodar',
    region: 'Павлодарская область',
    operator: 'ТОО «Богатырь Комир»',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy', 'power'],
    reserves: unconfirmedReserves,
    capacity: {
      display: '32 млн т в год',
      title: 'Проектная/производственная мощность разреза. Не является фактической добычей.',
    },
    sourceId: 'bogatyrKomir',
    status: INDICATOR_STATUS.company,
    note: 'Основной разрез ТОО «Богатырь Комир».',
  },
  {
    id: 'severny-pit',
    name: 'Разрез «Северный»',
    objectType: 'разрез/предприятие',
    regionId: 'pavlodar',
    region: 'Павлодарская область',
    operator: 'ТОО «Богатырь Комир»',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy', 'power'],
    reserves: unconfirmedReserves,
    capacity: {
      display: '10 млн т в год',
      title: 'Проектная/производственная мощность разреза. Не является фактической добычей.',
    },
    sourceId: 'bogatyrKomir',
    status: INDICATOR_STATUS.company,
    note: 'Основной разрез ТОО «Богатырь Комир».',
  },
  {
    id: 'shubarkol-deposit',
    name: 'Шубаркольское месторождение',
    objectType: 'месторождение',
    regionId: 'karaganda',
    region: 'Карагандинская область',
    operator: 'АО «Шубарколь Комир»',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy'],
    reserves: unconfirmedReserves,
    capacity: { display: '—', title: 'Сопоставимые подтвержденные данные пока отсутствуют' },
    sourceId: 'shubarkolErg',
    status: INDICATOR_STATUS.company,
    note: 'Не смешивать с Карагандинским угольным бассейном. Точный показатель запасов месторождения в текущую модель не включён.',
  },
  {
    id: 'shubarkol-company',
    name: 'АО «Шубарколь Комир»',
    objectType: 'разрез/предприятие',
    regionId: 'karaganda',
    region: 'Карагандинская область',
    operator: 'АО «Шубарколь Комир»',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy'],
    reserves: unconfirmedReserves,
    capacity: {
      display: '16,9 млн т в год',
      title: 'Производственная мощность по годовому отчёту 2023. Не является фактической добычей (12,544 млн т — actual 2022).',
    },
    sourceId: 'shubarkolErg',
    status: INDICATOR_STATUS.company,
    note: 'Основные разрезы: «Центральный» и «Западный». Один из крупных производителей энергетического угля Казахстана. Источник данных о предприятии: ERG.',
  },
  {
    id: 'shubarkol-central',
    name: 'Разрез «Центральный»',
    objectType: 'разрез/предприятие',
    regionId: 'karaganda',
    region: 'Карагандинская область',
    operator: 'АО «Шубарколь Комир»',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy'],
    reserves: unconfirmedReserves,
    capacity: { display: '—', title: 'Сопоставимые подтвержденные данные пока отсутствуют' },
    sourceId: 'shubarkolErg',
    status: INDICATOR_STATUS.company,
    note: 'Основной разрез АО «Шубарколь Комир» на Шубаркольском месторождении.',
  },
  {
    id: 'shubarkol-west',
    name: 'Разрез «Западный»',
    objectType: 'разрез/предприятие',
    regionId: 'karaganda',
    region: 'Карагандинская область',
    operator: 'АО «Шубарколь Комир»',
    coalUse: 'Энергетический уголь',
    segmentIds: ['energy'],
    reserves: unconfirmedReserves,
    capacity: { display: '—', title: 'Сопоставимые подтвержденные данные пока отсутствуют' },
    sourceId: 'shubarkolErg',
    status: INDICATOR_STATUS.company,
    note: 'Основной разрез АО «Шубарколь Комир» на Шубаркольском месторождении.',
  },
  {
    id: 'karazhyra-deposit',
    name: 'Месторождение Каражыра',
    objectType: 'месторождение',
    regionId: 'unspecified',
    region: '—',
    operator: 'АО «Каражыра»',
    coalUse: 'Коммунально-бытовой уголь',
    segmentIds: ['household'],
    reserves: {
      display: 'Нет сопоставимых подтвержденных данных в текущей модели',
      title: 'Сопоставимые подтвержденные данные пока отсутствуют',
    },
    capacity: { display: '—', title: 'Сопоставимые подтвержденные данные пока отсутствуют' },
    sourceId: 'azrkConcentration',
    status: INDICATOR_STATUS.official,
    note: 'АО «Каражыра» входит в число основных производителей коммунально-бытового угля согласно материалам АЗРК.',
  },
  {
    id: 'maikuben-basin',
    name: 'Майкубенский угольный бассейн',
    objectType: 'угольный бассейн',
    regionId: 'unspecified',
    region: '—',
    operator: 'АО «Майкубен-Вест» (ключевой производитель в текущей модели)',
    coalUse: 'Коммунально-бытовой уголь',
    segmentIds: ['household'],
    reserves: unconfirmedReserves,
    capacity: { display: '—', title: 'Сопоставимые подтвержденные данные пока отсутствуют' },
    sourceId: 'azrkConcentration',
    status: INDICATOR_STATUS.official,
    note: 'Оценка запасов бассейна не приводится без отдельного методологического подтверждения. АО «Майкубен-Вест» входит в число основных производителей коммунально-бытового угля согласно материалам АЗРК.',
  },
  {
    id: 'karaganda-basin',
    name: 'Карагандинский угольный бассейн',
    objectType: 'угольный бассейн',
    regionId: 'karaganda',
    region: 'Карагандинская область',
    operator: '—',
    coalUse: 'Коксующийся уголь',
    segmentIds: [],
    reserves: unconfirmedReserves,
    capacity: { display: '—', title: 'Сопоставимые подтвержденные данные пока отсутствуют' },
    sourceId: null,
    status: INDICATOR_STATUS.industry,
    note: 'Важный источник коксующегося угля для металлургической промышленности Казахстана. Не смешивать с Шубаркольским месторождением. Конкретная цифра запасов бассейна не указывается.',
  },
]

export const resourceGuide =
  'Геологические ресурсы, балансовые запасы предприятий и запасы, учитываемые государственной статистикой, являются различными показателями и могут рассчитываться по разной методологии. Поэтому в модуле они не суммируются и не сравниваются напрямую без методологического подтверждения.'

export const SLICE_EMPTY =
  'Нет подтверждённых данных для выбранного среза. Попробуйте изменить регион или сегмент.'

export const SLICE_NATIONAL_HINT =
  'Национальные данные доступны при выборе «Все регионы / республика» и «Все сегменты».'

export const unavailable = {
  monthlyProduction2026: 'Помесячная добыча за 2026 год в подтвержденных источниках текущего контура не опубликована.',
  monthlyExport2026: 'Экспорт за отдельные месяцы 2026 года в подтвержденных источниках текущего контура не опубликован.',
  worldPrices: 'Мировые цены на уголь в текущий набор официальных источников РК не включены.',
  depositReserves: 'Точные запасы отдельных месторождений в указанных публикациях БНС, Минэнерго и АЗРК не приведены.',
  companyVolumes: 'Объёмы производства отдельных компаний (кроме долей сегментов АЗРК) не подтверждены.',
  forecastPrices: 'Прогнозные цены в официальных источниках текущего контура не приведены.',
  newsFeed: 'Отдельная новостная лента не ведётся: используются только официальные публикации-источники.',
  regionalBreakdown:
    'Региональная разбивка национальных показателей БНС, Минэнерго и АЗРК в текущем наборе источников отсутствует.',
  astanaOnly:
    'Нет подтверждённых данных для выбранного среза. Розничные цены в текущем наборе есть только по г. Астана. Попробуйте выбрать «г. Астана» или «Все регионы / республика».',
}

export function getSource(sourceId) {
  return sources[sourceId]
}
