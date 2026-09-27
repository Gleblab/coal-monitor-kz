const COUNTRY_RU = {
  belgium: 'Бельгия',
  india: 'Индия',
  spain: 'Испания',
  indonesia: 'Индонезия',
  israel: 'Израиль',
  italy: 'Италия',
  croatia: 'Хорватия',
  morocco: 'Марокко',
  netherlands: 'Нидерланды',
  estonia: 'Эстония',
  latvia: 'Латвия',
  lithuania: 'Литва',
  czechia: 'Чехия',
  poland: 'Польша',
  georgia: 'Грузия',
  germany: 'Германия',
  turkey: 'Турция',
  china: 'Китай',
  uzbekistan: 'Узбекистан',
  kyrgyzstan: 'Кыргызстан',
  russia: 'Россия',
  malaysia: 'Малайзия',
  uae: 'ОАЭ',
  brazil: 'Бразилия',
  azerbaijan: 'Азербайджан',
  iran: 'Иран',
  taiwan: 'Тайвань (Китай)',
}

export function countryNameRu(code, fallback) {
  if (code && COUNTRY_RU[code]) return COUNTRY_RU[code]
  return fallback || code || 'Не указано'
}
