/**
 * Качественные факторы внешних направлений.
 * Числовые объёмы и YoY подставляются со страницы из Supabase.
 * Здесь нет собственных рейтингов и прогнозных цифр.
 * Contextual claims только при подтверждении указанным источником.
 */
export const EXPORT_MARKET_FACTORS = [
  {
    id: 'russia',
    codes: ['russia'],
    title: 'Россия',
    facts: [
      {
        text: 'Крупнейшая страна-партнёр Казахстана по объёму экспорта ТН ВЭД 2701 в январе–июле 2026.',
        sourceIds: ['bnsTradeYtd2026'],
      },
      {
        text: 'КТЖ описывает железнодорожные линии к границе с Россией и прямое сообщение с российской сетью.',
        sourceIds: ['ktzNetwork'],
      },
    ],
    constraints: [
      {
        text: 'Объём января–июля 2026 ниже сопоставимого января–июля 2025; это наблюдение ряда, а не прогноз и не долгосрочный тренд.',
        sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
      },
    ],
    sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback', 'ktzNetwork'],
  },
  {
    id: 'poland',
    codes: ['poland'],
    title: 'Польша',
    facts: [
      {
        text: 'Одно из крупнейших направлений экспорта ТН ВЭД 2701 Казахстана в январе–июле 2026.',
        sourceIds: ['bnsTradeYtd2026'],
      },
      {
        text: 'В сопоставимом периоде объём выше, чем в январе–июле 2025.',
        sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
      },
    ],
    constraints: [
      {
        text: 'При интерпретации европейских направлений учитывается политика ЕС по переходу угольных регионов к чистой энергии и сокращению использования угля. Это контекст, а не оценка спроса Польши на уголь Казахстана.',
        sourceIds: ['euCoalRegions'],
      },
    ],
    sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback', 'euCoalRegions'],
  },
  {
    id: 'china',
    codes: ['china'],
    title: 'Китай',
    facts: [
      {
        text: 'КТЖ фиксирует сухопутные железнодорожные переходы с Китаем: Дружба (Достык) — Алашанькоу и Жетыген — Алтынколь (Хоргос). Экспорт ТН ВЭД 2701 в направлении Китая в ряду присутствует.',
        sourceIds: ['ktzNetwork', 'bnsTradeYtd2026'],
      },
      {
        text: 'По IEA Китай — крупнейший в мире потребитель угля при одновременно высокой собственной добыче (около половины мировой добычи в оценке IEA Coal 2024).',
        sourceIds: ['ieaCoal2024'],
      },
    ],
    constraints: [
      {
        text: 'Масштаб рынка и наличие переходов не означают приоритет поставок из Казахстана.',
        sourceIds: [],
      },
    ],
    sourceIds: ['bnsTradeYtd2026', 'ktzNetwork', 'ieaCoal2024'],
  },
  {
    id: 'turkey',
    codes: ['turkey'],
    title: 'Турция',
    facts: [
      {
        text: 'В январе–июле 2026 объём экспорта ТН ВЭД 2701 выше, чем в сопоставимом периоде 2025.',
        sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
      },
    ],
    constraints: [
      {
        text: 'Страна-партнёр во внешнеторговой статистике не обязательно совпадает с конечным потребителем.',
        sourceIds: ['bnsTradeYtd2026'],
      },
    ],
    sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
  },
  {
    id: 'india',
    codes: ['india'],
    title: 'Индия',
    facts: [
      {
        text: 'По IEA Coal 2024 Индия — второй по величине мировой импортёр угля (после Китая). Экспорт Казахстана по ТН ВЭД 2701 в этом направлении в ряду присутствует.',
        sourceIds: ['ieaCoal2024', 'bnsTradeYtd2026'],
      },
    ],
    constraints: [
      {
        text: 'В январе–июле 2026 объём ниже, чем в январе–июле 2025. Это сопоставление двух YTD-периодов, а не долгосрочный тренд.',
        sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
      },
    ],
    sourceIds: ['ieaCoal2024', 'bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
  },
  {
    id: 'central-asia',
    codes: ['uzbekistan', 'kyrgyzstan'],
    title: 'Узбекистан / Кыргызстан',
    facts: [
      {
        text: 'Торговля ТН ВЭД 2701 с Узбекистаном и Кыргызстаном зафиксирована. КТЖ описывает железнодорожную магистраль Оренбург–Ташкент до границы с Узбекистаном.',
        sourceIds: ['bnsTradeYtd2026', 'ktzNetwork'],
      },
    ],
    constraints: [
      {
        text: 'В январе–июле 2026 объёмы этих направлений меньше, чем у крупнейших стран-партнёров того же периода.',
        sourceIds: ['bnsTradeYtd2026'],
      },
    ],
    sourceIds: ['bnsTradeYtd2026', 'ktzNetwork'],
  },
  {
    id: 'malaysia',
    codes: ['malaysia'],
    title: 'Малайзия',
    facts: [
      {
        text: 'В январе–июле 2026 объём экспорта ТН ВЭД 2701 выше, чем в январе–июле 2025.',
        sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
      },
    ],
    constraints: [
      {
        text: 'Сопоставление двух YTD-периодов не доказывает устойчивый долгосрочный тренд.',
        sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
      },
    ],
    sourceIds: ['bnsTradeYtd2026', 'bnsTradeYtd2025Wayback'],
  },
  {
    id: 'netherlands',
    codes: ['netherlands'],
    title: 'Нидерланды',
    facts: [
      {
        text: 'Направление присутствует в статистике внешней торговли ТН ВЭД 2701 как страна-партнёр.',
        sourceIds: ['bnsTradeYtd2026'],
      },
    ],
    constraints: [
      {
        text: 'Страна-партнёр во внешнеторговой статистике не обязательно совпадает с конечным потребителем.',
        sourceIds: ['bnsTradeYtd2026'],
      },
    ],
    sourceIds: ['bnsTradeYtd2026'],
    logisticsCase: true,
  },
]
