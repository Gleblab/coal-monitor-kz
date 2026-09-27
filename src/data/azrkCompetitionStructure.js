/**
 * Качественная структура конкуренции по публикациям АЗРК.
 * Числовые доли 2024/2025 берутся из market_shares, не из этого файла.
 */

export const AZRK_STRUCTURE_SOURCE = 'azrkConcentration'
export const AZRK_ANALYSIS_SOURCE = 'azrkCoalMarketAnalysis2025'
export const AZRK_HISTORICAL_SOURCE = 'azrkCompetitionReport2024'

export const AZRK_OLIGOPOLY_NOTE = {
  sourceId: AZRK_STRUCTURE_SOURCE,
  text:
    'АЗРК характеризует первичный оптовый рынок как высококонцентрированный с практически неизменной олигопольной структурой.',
}

export const CONCENTRATION_SEGMENT_META = {
  householdShare: {
    shortLabel: 'Коммунально-бытовой',
    marketName: 'первичная оптовая реализация коммунально-бытового угля',
    crKind: 'CR-2',
    participants: ['группа лиц ERG', 'АО «Каражыра»'],
    keyCapacity: ['АО «Шубарколь Комир»', 'АО «Каражыра»'],
  },
  powerShare: {
    shortLabel: 'Энергетический',
    marketName:
      'первичная оптовая реализация угля для нужд энергопроизводящих организаций',
    crKind: 'CR-2',
    participants: ['ТОО «Богатырь Комир»', 'ТОО «Kazakhmys Coal»'],
    keyCapacity: ['ТОО «Богатырь Комир»', 'ТОО «Kazakhmys Coal»'],
  },
  industrialShare: {
    shortLabel: 'Промышленный',
    marketName: 'первичная оптовая реализация угля для промышленных нужд',
    crKind: 'CR-1',
    participants: ['группа лиц ERG'],
    keyCapacity: ['АО «Евроазиатская энергетическая корпорация»', 'АО «Шубарколь Комир»'],
  },
}

export const AZRK_CR_GUIDE = {
  sourceId: AZRK_STRUCTURE_SOURCE,
  cr1: 'доля крупнейшего участника/группы лиц соответствующего сегмента первичной оптовой реализации.',
  cr2: 'совокупная доля двух указанных крупнейших участников/групп в соответствующем сегменте.',
  limit:
    'CR-3 за 2024–2025 не рассчитывается: полного набора индивидуальных долей в опубликованных материалах нет.',
}

export const AZRK_HHI_NOTE = {
  sourceId: AZRK_ANALYSIS_SOURCE,
  text:
    'HHI за 2024–2025 в опубликованной версии заключения АЗРК не раскрыт. Coal Monitor KZ не восстанавливает показатель из неполных данных.',
}

export const AZRK_KEY_CAPACITY_RULE = {
  sourceId: AZRK_STRUCTURE_SOURCE,
  text:
    'АЗРК указывает, что после признания субъектов обладателями ключевой мощности реализация должна осуществляться в соответствии с Правилами равного доступа к ключевой мощности.',
}

export const AZRK_STRUCTURAL_FACTORS = [
  {
    id: 'resource-access',
    sourceId: AZRK_STRUCTURE_SOURCE,
    text: 'АЗРК указывает на ограниченный доступ к ресурсу как одну из ключевых причин высокой концентрации.',
  },
  {
    id: 'deposits-contracts',
    sourceId: AZRK_STRUCTURE_SOURCE,
    text:
      'По оценке Агентства, основные месторождения распределены между субъектами рынка и действуют долгосрочные контракты на недропользование.',
  },
]

export const AZRK_MEASURES = [
  {
    id: 'price-regulation',
    status: 'Заявлено',
    sourceId: AZRK_STRUCTURE_SOURCE,
    text: 'регулирование цен на энергетический и коммунально-бытовой уголь',
  },
  {
    id: 'exchange-52',
    status: 'Предусмотрено',
    sourceId: AZRK_STRUCTURE_SOURCE,
    text:
      'увеличение объёмов угля, реализуемых через товарную биржу, до 52%',
  },
  {
    id: 'otc-key-capacity',
    status: 'Заявлено',
    sourceId: AZRK_STRUCTURE_SOURCE,
    text:
      'признание внебиржевых объёмов реализации угля ключевой мощностью с последующим выводом этих объёмов на цифровые платформы',
  },
  {
    id: 'equal-access',
    status: 'Предусмотрено',
    sourceId: AZRK_STRUCTURE_SOURCE,
    text:
      'применение Правил равного доступа к ключевой мощности для соответствующих субъектов',
  },
]

export const AZRK_HISTORICAL_HOUSEHOLD_CR3 = {
  sourceId: AZRK_HISTORICAL_SOURCE,
  title: 'Предыдущий контур анализа',
  participants: ['АО «Шубарколь Комир»', 'АО «Каражыра»', 'АО «Майкубен-Вест»'],
  rows: [
    { year: 2022, share: 81, unit: '%' },
    { year: 2023, share: 82, unit: '%' },
  ],
  note:
    'Официальный отчёт АЗРК за 2024 год указывает совокупную долю трёх основных производителей коммунально-бытового угля. Это CR-3 другого методологического контура, не сопоставимый ряд с показателем ERG + Каражыра за 2024–2025 годы.',
}

export const AZRK_PARTICIPANTS_NOTE =
  'АЗРК публикует указанные совокупные показатели для соответствующих сегментов. Coal Monitor KZ не разделяет совокупную долю между компаниями без опубликованных индивидуальных значений.'

export const AZRK_DELTA_NOTE =
  'Изменение доли не означает автоматически усиление или ослабление конкуренции без анализа структуры всего соответствующего рынка.'

export const AZRK_PRICE_CAUSALITY_NOTE =
  'АЗРК приводит динамику цен в контексте анализа олигопольной структуры рынка. Эти показатели сами по себе не доказывают причинно-следственную связь между концентрацией и ростом цен. АЗРК рассматривает высокую концентрацию и динамику цен в рамках одного анализа рынка.'

export const AZRK_UNPUBLISHED_NOTE =
  'Индивидуальные доли 2024–2025 и натуральные объёмы реализации участников не восстанавливаются без опубликованных исходных данных.'
