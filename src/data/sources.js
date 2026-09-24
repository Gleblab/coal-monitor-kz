export const SOURCE_STATUS = {
  official: 'Официальный источник',
  company: 'Данные предприятия',
}

export const INDICATOR_STATUS = {
  official: 'Официальные данные',
  industry: 'Отраслевая оценка',
  plan: 'План',
  regional: 'Региональные данные',
  company: 'Данные предприятия',
  demo: 'Демонстрационные данные',
}

export const sources = {
  bnsReserves2024: {
    id: 'bnsReserves2024',
    organization: 'Бюро национальной статистики Республики Казахстан',
    publication:
      'Счет минеральных и энергетических ресурсов Республики Казахстан (На конец 2024 года)',
    period: 'На конец 2024 года',
    url: 'https://stat.gov.kz/ru/industries/environment/stat-speu/publications/504418/',
    sourceStatus: SOURCE_STATUS.official,
    indicators: [
      'Запасы угля на конец 2024 года',
      'Добыча угля в рамках статистического счета за 2024 год',
    ],
  },
  bnsTeb2025: {
    id: 'bnsTeb2025',
    organization: 'Бюро национальной статистики Республики Казахстан',
    publication: 'Топливно-энергетический баланс Республики Казахстан (2025г.)',
    period: '2025 год',
    url: 'https://stat.gov.kz/ru/industries/business-statistics/stat-energy/publications/509795/',
    sourceStatus: SOURCE_STATUS.official,
    indicators: [
      'Доля угля в общем первичном потреблении энергии, 2025',
      'Доля угля в конечном потреблении энергии, 2025',
    ],
  },
  minenergo2025: {
    id: 'minenergo2025',
    organization: 'Министерство энергетики Республики Казахстан',
    publication: 'Официальное сообщение об итогах угольной отрасли за 2025 год и планах на 2026 год',
    period: '2025 год (факт), 2026 год (план / ожидания)',
    url: 'https://www.gov.kz/memleket/entities/energo/press/news/details/1221846?lang=ru',
    sourceStatus: SOURCE_STATUS.official,
    indicators: [
      'Добыча угля, 2025',
      'Внутреннее направление, 2025',
      'Экспорт, 2025',
      'План добычи, 2026',
      'Число недропользователей',
      'Инвестиции, 2025 и ожидания 2026',
      'Отраслевая оценка запасов',
    ],
  },
  azrkConcentration: {
    id: 'azrkConcentration',
    organization: 'Агентство по защите и развитию конкуренции Республики Казахстан',
    publication:
      'Официальное сообщение о состоянии конкуренции на рынке угля, включая концентрацию сегментов первичной оптовой реализации и накопленную динамику цен',
    period: '2024–2025 годы; динамика цен 2022–2025 годы',
    url: 'https://www.gov.kz/memleket/entities/zk/press/news/details/1272646?lang=ru',
    sourceStatus: SOURCE_STATUS.official,
    indicators: [
      'Концентрация сегментов первичной оптовой реализации угля',
      'Накопленный рост цен при первичной оптовой реализации, 2022–2025',
      'Положение АО «Каражыра» и АО «Майкубен-Вест» среди основных производителей коммунально-бытового угля',
    ],
  },
  astanaAkimat: {
    id: 'astanaAkimat',
    organization: 'Акимат города Астаны',
    publication: 'Официальное сообщение о средних розничных ценах на уголь в г. Астана',
    period: 'Значения, опубликованные акиматом в указанном сообщении',
    url: 'https://www.gov.kz/memleket/entities/astana/press/news/details/1291905?lang=ru',
    sourceStatus: SOURCE_STATUS.official,
    indicators: ['Средние розничные цены на отдельные марки угля в г. Астана'],
  },
  bogatyrKomir: {
    id: 'bogatyrKomir',
    organization: 'ТОО «Богатырь Комир»',
    publication: 'Официальная страница предприятия: история и производственные показатели',
    period: 'Значения, опубликованные предприятием на указанной странице',
    url: 'https://bogatyr.kz/ru/about/history/',
    sourceStatus: SOURCE_STATUS.company,
    indicators: [
      'Балансовые запасы ТОО «Богатырь Комир»',
      'Производственная мощность предприятия и разрезов «Богатырь» и «Северный»',
    ],
  },
  shubarkolErg: {
    id: 'shubarkolErg',
    organization: 'Eurasian Resources Group (ERG)',
    publication: 'Страница предприятия АО «Шубарколь Комир»',
    period: 'Значения, опубликованные группой на странице предприятия',
    url: 'https://www.erg.kz/ru/enterprises/ao-shubarkol-komir',
    sourceStatus: SOURCE_STATUS.company,
    indicators: ['Производственная мощность АО «Шубарколь Комир»'],
  },
}

export const sourceList = Object.values(sources)
