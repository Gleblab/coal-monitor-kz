export const RETAIL_BRAND_COLORS = {
  Шубаркуль: '#5eead4',
  Каражыра: '#c4a056',
  Майкуба: '#7dd3fc',
  Богатырь: '#fb7185',
  Экибастуз: '#a78bfa',
}

export function brandColor(brand) {
  return RETAIL_BRAND_COLORS[brand] || '#8b9bb3'
}

export function coverageYear(value) {
  if (!value) return null
  const year = Number(String(value).slice(0, 4))
  return Number.isFinite(year) ? year : null
}

export function publicationSequenceId(url) {
  const match = String(url || '').match(/\/details\/(\d+)/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

export function freshnessFromObservation(item) {
  const year = coverageYear(item.observationDate) || coverageYear(item.periodStart)
  if (year) return String(year)
  return 'undated'
}

export function filterRetailByRegion(items, region) {
  if (!region || region === 'all') return items
  return items.filter((item) => item.region?.code === region)
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'ru'))
}

export function ruPlural(count, one, few, many) {
  const n = Number(count)
  const safe = Number.isFinite(n) ? Math.abs(Math.trunc(n)) : 0
  const mod10 = safe % 10
  const mod100 = safe % 100
  const word =
    mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${safe} ${word}`
}

export function pluralizeObservation(count) {
  return ruPlural(count, 'наблюдение', 'наблюдения', 'наблюдений')
}

export function pluralizeLocality(count) {
  return ruPlural(count, 'населённый пункт', 'населённых пункта', 'населённых пунктов')
}

export function pluralizeRegion(count) {
  return ruPlural(count, 'регион', 'региона', 'регионов')
}

export function pluralizeBrand(count) {
  return ruPlural(count, 'марка', 'марки', 'марок')
}

function pointPrice(item) {
  return typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null
}

export function astanaSnapshotSeries(items) {
  const astana = items.filter(
    (item) => item.region?.code === 'astana' && pointPrice(item) != null && item.publicationUrl,
  )
  const groups = new Map()
  for (const item of astana) {
    const seq = publicationSequenceId(item.publicationUrl)
    const key = item.publicationUrl
    if (!groups.has(key)) {
      groups.set(key, { url: key, seq, items: [] })
    }
    groups.get(key).items.push(item)
  }
  const ordered = [...groups.values()].sort((a, b) => {
    if (a.seq != null && b.seq != null && a.seq !== b.seq) return a.seq - b.seq
    return String(a.url).localeCompare(String(b.url))
  })
  const brands = uniqueSorted(astana.map((item) => item.brand))
  const rows = ordered.map((group, index) => {
    const sourceOrg = group.items.find((item) => item.source?.organization)?.source?.organization || 'Акимат города Астаны'
    const publicationDate = group.items.find((item) => item.publicationDate)?.publicationDate || null
    const observationDate = group.items.find((item) => item.observationDate)?.observationDate || null
    const row = {
      sliceKey: `slice-${index + 1}`,
      sliceLabel: group.seq != null ? `№${group.seq}` : 'срез',
      sliceId: group.seq,
      url: group.url,
      sourceOrg,
      publicationDate,
      observationDate,
    }
    for (const brand of brands) {
      const hit = group.items.find((item) => item.brand === brand)
      row[brand] = hit ? pointPrice(hit) : null
    }
    return row
  })
  const chronologyConfirmed =
    ordered.length > 1 &&
    ordered.every((group) => group.items.some((item) => item.publicationDate))
  return {
    rows,
    brands: brands.map((brand) => ({ key: brand, name: brand, color: brandColor(brand) })),
    chronologyConfirmed,
    dated: chronologyConfirmed,
  }
}

export function latestAstanaSnapshot(items) {
  const series = astanaSnapshotSeries(items)
  if (!series.rows.length) return { brands: [], dated: false }
  const registryUrl = items.find((item) => item.region?.code === 'astana' && item.source?.url)?.source?.url
  const selected =
    registryUrl &&
    series.rows.find((row) => {
      if (!row.url) return false
      if (row.url === registryUrl) return true
      const rowId = publicationSequenceId(row.url)
      const registryId = publicationSequenceId(registryUrl)
      return rowId != null && registryId != null && rowId === registryId
    })
  if (!selected) return { brands: [], dated: series.dated }
  return {
    dated: series.dated,
    sliceId: selected.sliceId,
    sliceLabel: selected.sliceLabel,
    url: selected.url,
    sourceOrg: selected.sourceOrg,
    brands: series.brands
      .map((brand) => ({
        brand: brand.name,
        price: selected[brand.key],
        color: brand.color,
      }))
      .filter((item) => item.price != null),
  }
}

export function oskemen2026Retail(items) {
  const rows = items.filter(
    (item) =>
      item.region?.code === 'east-kazakhstan' &&
      coverageYear(item.periodStart) === 2026 &&
      pointPrice(item) != null,
  )
  const byBrand = new Map()
  for (const item of rows) {
    if (!byBrand.has(item.brand)) byBrand.set(item.brand, [])
    byBrand.get(item.brand).push(item)
  }
  return [...byBrand.entries()].map(([brand, list]) => {
    const prices = list.map(pointPrice).filter((value) => value != null).sort((a, b) => a - b)
    return {
      brand,
      min: prices[0],
      max: prices[prices.length - 1],
      count: list.length,
      sellers: uniqueSorted(list.map((item) => item.seller)),
      locality: list[0]?.locality || null,
    }
  })
}

export function brandRanges(items) {
  const byBrand = new Map()
  for (const item of items) {
    const price = pointPrice(item)
    if (price == null) continue
    if (!byBrand.has(item.brand)) {
      byBrand.set(item.brand, { brand: item.brand, prices: [], localities: new Set() })
    }
    const pack = byBrand.get(item.brand)
    pack.prices.push(price)
    if (item.locality) pack.localities.add(item.locality)
  }
  const rows = [...byBrand.values()].map((pack) => {
    const prices = pack.prices.sort((a, b) => a - b)
    return {
      brand: pack.brand,
      min: prices[0],
      max: prices[prices.length - 1],
      count: prices.length,
      localityCount: pack.localities.size,
      color: brandColor(pack.brand),
    }
  })
  rows.sort((a, b) => String(a.brand).localeCompare(String(b.brand), 'ru'))
  if (!rows.length) return { rows: [], domainMin: 0, domainMax: 1 }
  const domainMin = Math.min(...rows.map((row) => row.min))
  const domainMax = Math.max(...rows.map((row) => row.max))
  return { rows, domainMin, domainMax }
}

export function stockPoints(items) {
  return items
    .filter((item) => item.stockTonnes != null && pointPrice(item) != null)
    .map((item) => ({
      id: item.id,
      price: pointPrice(item),
      stockTonnes: item.stockTonnes,
      locality: item.locality,
      seller: item.seller,
      brand: item.brand,
      variant: item.variant,
      sourceCode: item.source?.code || null,
      sourceOrg: item.source?.organization || null,
      freshness: freshnessFromObservation(item),
    }))
}

export function geoPoints(items) {
  return items
    .filter((item) => item.locality && pointPrice(item) != null)
    .map((item) => ({
      id: item.id,
      locality: item.locality,
      price: pointPrice(item),
      seller: item.seller,
      brand: item.brand,
      variant: item.variant,
      stockTonnes: item.stockTonnes,
      sourceCode: item.source?.code || null,
      sourceOrg: item.source?.organization || null,
      freshness: freshnessFromObservation(item),
      period: item.observationDate || item.periodStart || null,
    }))
}

export function coverageMeta(items) {
  const years = items
    .flatMap((item) => [
      coverageYear(item.observationDate),
      coverageYear(item.publicationDate),
      coverageYear(item.periodStart),
    ])
    .filter(Boolean)
  const withDate = items.filter(
    (item) =>
      coverageYear(item.observationDate) ||
      coverageYear(item.publicationDate) ||
      coverageYear(item.periodStart),
  )
  const dated2026 = items.filter(
    (item) =>
      coverageYear(item.observationDate) === 2026 || coverageYear(item.periodStart) === 2026,
  )
  return {
    count: items.length,
    regionCount: uniqueSorted(items.map((item) => item.region?.code)).length,
    regionNames: uniqueSorted(items.map((item) => item.region?.name || item.region?.code)),
    localityCount: uniqueSorted(items.map((item) => item.locality)).length,
    brandCount: uniqueSorted(items.map((item) => item.brand)).length,
    stockCount: items.filter((item) => item.stockTonnes != null && pointPrice(item) != null).length,
    latestYear: years.length ? Math.max(...years) : null,
    datedCount: withDate.length,
    undatedCount: items.length - withDate.length,
    dated2026Localities: uniqueSorted(dated2026.map((item) => item.locality)),
  }
}

export function classifySupplyItems(items) {
  return (items || []).map((item) => {
    const code = item.source?.code
    let group = 'other'
    if (code === 'etsShubarkol2026' || code === 'ccxKarazhyraPlan2026') group = 'exchange-plan'
    if (code === 'kaenkHouseholdCoal2026') group = 'ministry'
    if (code === 'vkoOskemenCoal2026') group = 'local-plan'
    return { ...item, group }
  })
}
