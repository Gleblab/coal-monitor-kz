/** Какие измерения реально применяются на маршруте.
 * region/segment = true только если страница умеет фильтровать
 * по существующим observation, без пропорционального пересчёта.
 */
const CAPABILITIES = {
  '/': {
    region: false,
    segment: false,
    reason:
      'Обзор показывает только национальные итоги БНС и Минэнерго. Региональной или сегментной разбивки этих карточек в наборе нет.',
  },
  '/energy-role': {
    region: true,
    segment: true,
    reason: null,
  },
  '/resources': {
    region: true,
    segment: true,
    reason: null,
  },
  '/production': {
    region: false,
    segment: false,
    reason: 'Объёмы и баланс — национальные ряды Минэнерго / БНС без region × segment.',
  },
  '/geography': {
    region: true,
    segment: false,
    reason:
      'Сегмент не применяется: промышленная добыча БНС не является рыночным сегментом АЗРК.',
  },
  '/outlook': {
    region: false,
    segment: false,
    reason: 'Перспективы и программа генерации заданы на национальном уровне, без регионального ТЭБ.',
  },
  '/concentration': {
    region: false,
    segment: true,
    reason: 'Доли АЗРК — национальные сегменты оптовой реализации, без region_id.',
  },
  '/dynamics': {
    region: false,
    segment: true,
    reason:
      'Накопленный рост 2022–2025 и исторические средневзвешенные цены АЗРК заданы на национальном уровне по сегментам, без регионального ряда.',
  },
  '/retail': {
    region: true,
    segment: false,
    reason:
      'Розничные наблюдения фильтруются по region_id (Астана, СКО, ВКО). Сегменты АЗРК к этим точкам не применяются.',
  },
  '/sources': {
    region: false,
    segment: false,
    reason: 'Каталог источников не зависит от среза.',
  },
  '/companies': {
    region: false,
    segment: false,
    reason: 'Карточки компаний не являются региональным или сегментным срезом дашборда.',
  },
  '/exports': {
    region: false,
    segment: false,
    reason: 'Экспорт ТН ВЭД 2701 — национальный reporter Kazakhstan, без региональной разбивки.',
  },
  '/constraints': {
    region: false,
    segment: false,
    reason: 'Ограничения и задачи описаны на национальном уровне.',
  },
}

export function getFilterCapability(pathname, filters = {}) {
  if (pathname === '/energy-role' && filters.region && filters.region !== 'all') {
    return {
      region: true,
      segment: false,
      reason:
        'Сектор ТЭБ БНС и сегменты АЗРК не применяются к региональному энергетическому профилю. Независимые наблюдения не фильтруются по сегменту.',
    }
  }
  const route = pathname.startsWith('/outlook') ? '/outlook' : pathname
  return (
    CAPABILITIES[route] || {
      region: false,
      segment: false,
      reason: 'Для этого раздела срез region/segment не применяется.',
    }
  )
}
