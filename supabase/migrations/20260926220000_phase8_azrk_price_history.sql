-- Phase 8: historical AZRK producer prices (2018 — H1 2022) and Bogatyr list prices.
-- Additive. Does not alter existing cumulative_growth 2022–2025 or Astana retail rows.
-- Apply in Supabase SQL editor / migration runner when ready. Not applied from the app.

COMMENT ON COLUMN public.prices.market_level IS
  'retail | wholesale_primary | producer_weighted | producer_list_price | siding_range. Ряды разных market_level не объединять в один временной ряд.';
