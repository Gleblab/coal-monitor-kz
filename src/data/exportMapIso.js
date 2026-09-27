/** partner_code / destination_country → Natural Earth ISO_A3 */

export const PARTNER_TO_ISO3 = {
  azerbaijan: 'AZE',
  belgium: 'BEL',
  brazil: 'BRA',
  china: 'CHN',
  croatia: 'HRV',
  czechia: 'CZE',
  estonia: 'EST',
  georgia: 'GEO',
  germany: 'DEU',
  india: 'IND',
  indonesia: 'IDN',
  iran: 'IRN',
  israel: 'ISR',
  italy: 'ITA',
  kyrgyzstan: 'KGZ',
  latvia: 'LVA',
  lithuania: 'LTU',
  malaysia: 'MYS',
  morocco: 'MAR',
  netherlands: 'NLD',
  poland: 'POL',
  russia: 'RUS',
  spain: 'ESP',
  taiwan: 'TWN',
  turkey: 'TUR',
  uae: 'ARE',
  uzbekistan: 'UZB',
}

const DESTINATION_TO_CODE = {
  azerbaijan: 'azerbaijan',
  belgium: 'belgium',
  brazil: 'brazil',
  china: 'china',
  "people's republic of china": 'china',
  croatia: 'croatia',
  czechia: 'czechia',
  'czech republic': 'czechia',
  estonia: 'estonia',
  georgia: 'georgia',
  germany: 'germany',
  india: 'india',
  indonesia: 'indonesia',
  iran: 'iran',
  'iran, islamic republic of': 'iran',
  'islamic republic of iran': 'iran',
  israel: 'israel',
  italy: 'italy',
  kyrgyzstan: 'kyrgyzstan',
  'kyrgyz republic': 'kyrgyzstan',
  latvia: 'latvia',
  lithuania: 'lithuania',
  malaysia: 'malaysia',
  morocco: 'morocco',
  netherlands: 'netherlands',
  'the netherlands': 'netherlands',
  holland: 'netherlands',
  poland: 'poland',
  russia: 'russia',
  'russian federation': 'russia',
  spain: 'spain',
  taiwan: 'taiwan',
  'taiwan (china)': 'taiwan',
  'chinese taipei': 'taiwan',
  turkey: 'turkey',
  türkiye: 'turkey',
  turkiye: 'turkey',
  uae: 'uae',
  'united arab emirates': 'uae',
  uzbekistan: 'uzbekistan',
}

export const KAZAKHSTAN_ISO3 = 'KAZ'

export function partnerCodeFromObservation(partnerCode, destinationCountry) {
  if (partnerCode && PARTNER_TO_ISO3[partnerCode]) return partnerCode
  const key = String(destinationCountry || '')
    .trim()
    .toLowerCase()
  return DESTINATION_TO_CODE[key] || partnerCode || null
}

export function iso3FromPartner(partnerCode, destinationCountry) {
  const code = partnerCodeFromObservation(partnerCode, destinationCountry)
  return (code && PARTNER_TO_ISO3[code]) || null
}
