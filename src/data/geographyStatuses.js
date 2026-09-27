/** Публикационный статус областей в годовом ряду БНС КСП 151102 за 2025.
 * Не статистические объёмы: numeric rows живут только в Supabase production.
 */
export const GEOGRAPHY_STATUS_2025 = {
  akmola: 'confidential',
  almaty: 'confidential',
}

export const GEOGRAPHY_STATUS_LABEL = {
  confidential: 'Значение конфиденциально и не опубликовано в используемом наборе данных',
  unpublished: 'Нет опубликованного значения в используемом наборе данных',
}
