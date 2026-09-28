-- Infrastructure Intelligence: named topology + sourced observations.
-- Не дублирует production. Не хранит вычисляемые пробелы.
-- Нет источника — нет цифры. Нет доказанной связи — нет линии.

-- ---------------------------------------------------------------------------
-- Nodes
-- ---------------------------------------------------------------------------

CREATE TABLE public.infrastructure_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  node_type text NOT NULL,
  display_name text NOT NULL,
  category_label text NOT NULL,
  company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  coal_asset_id uuid REFERENCES public.coal_assets (id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.regions (id) ON DELETE RESTRICT,
  chain_order integer,
  source_id uuid REFERENCES public.sources (id) ON DELETE RESTRICT,
  evidence_classification text NOT NULL,
  notes text,
  limitations text,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infrastructure_nodes_type_check CHECK (
    node_type IN (
      'producer',
      'mine',
      'processing',
      'loading',
      'rail_station',
      'rail_section',
      'supply_direction',
      'data_gap'
    )
  ),
  CONSTRAINT infrastructure_nodes_class_check CHECK (
    evidence_classification IN (
      'RELATIONSHIP_VERIFIED',
      'QUANTITATIVE_VERIFIED',
      'HISTORICAL',
      'CONTEXT_ONLY',
      'PARTIAL',
      'DATA_GAP'
    )
  ),
  CONSTRAINT infrastructure_nodes_gap_class_check CHECK (
    (node_type = 'data_gap' AND evidence_classification = 'DATA_GAP')
    OR (node_type <> 'data_gap' AND evidence_classification <> 'DATA_GAP')
  ),
  CONSTRAINT infrastructure_nodes_chain_order_check CHECK (
    chain_order IS NULL OR chain_order >= 1
  ),
  CONSTRAINT infrastructure_nodes_company_required_check CHECK (
    company_id IS NOT NULL
  )
);

COMMENT ON TABLE public.infrastructure_nodes IS
  'Именованные инфраструктурные объекты и явные пробелы. Не производственные показатели. data_gap — аналитический объект, не подтверждённый рынок.';

COMMENT ON COLUMN public.infrastructure_nodes.chain_order IS
  'Порядок на цепочке производителя. NULL — identity/context, не материалопоток.';

COMMENT ON COLUMN public.infrastructure_nodes.evidence_classification IS
  'Классификация узла. DATA_GAP только для node_type=data_gap.';

CREATE INDEX infrastructure_nodes_type_idx
  ON public.infrastructure_nodes (node_type);

CREATE INDEX infrastructure_nodes_company_idx
  ON public.infrastructure_nodes (company_id);

CREATE INDEX infrastructure_nodes_asset_idx
  ON public.infrastructure_nodes (coal_asset_id);

CREATE INDEX infrastructure_nodes_region_idx
  ON public.infrastructure_nodes (region_id);

CREATE INDEX infrastructure_nodes_chain_idx
  ON public.infrastructure_nodes (company_id, chain_order)
  WHERE chain_order IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Links
-- ---------------------------------------------------------------------------

CREATE TABLE public.infrastructure_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  from_node_id uuid NOT NULL REFERENCES public.infrastructure_nodes (id) ON DELETE RESTRICT,
  to_node_id uuid NOT NULL REFERENCES public.infrastructure_nodes (id) ON DELETE RESTRICT,
  relationship_type text NOT NULL,
  source_id uuid REFERENCES public.sources (id) ON DELETE RESTRICT,
  evidence_classification text NOT NULL,
  period_start date,
  period_end date,
  evidence_statement text NOT NULL,
  limitations text,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infrastructure_links_no_self CHECK (from_node_id <> to_node_id),
  CONSTRAINT infrastructure_links_type_check CHECK (
    relationship_type IN (
      'PROCESSES_AT',
      'LOADS_AT',
      'CONNECTED_TO',
      'SHIPS_VIA',
      'SUPPLIES_TOWARD'
    )
  ),
  CONSTRAINT infrastructure_links_class_check CHECK (
    evidence_classification IN (
      'RELATIONSHIP_VERIFIED',
      'QUANTITATIVE_VERIFIED',
      'HISTORICAL',
      'CONTEXT_ONLY',
      'PARTIAL',
      'DATA_GAP'
    )
  ),
  CONSTRAINT infrastructure_links_period_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),
  CONSTRAINT infrastructure_links_verified_source_check CHECK (
    evidence_classification IN ('CONTEXT_ONLY', 'DATA_GAP', 'PARTIAL')
    OR source_id IS NOT NULL
  )
);

COMMENT ON TABLE public.infrastructure_links IS
  'Только явно подтверждённые отношения. Транзитивные связи не выводятся. DATA_GAP-link не является доказанной связью.';

COMMENT ON COLUMN public.infrastructure_links.evidence_classification IS
  'RELATIONSHIP_VERIFIED / QUANTITATIVE_VERIFIED — сплошная линия. DATA_GAP — прерывание, не маршрут.';

CREATE UNIQUE INDEX infrastructure_links_pair_type_uidx
  ON public.infrastructure_links (from_node_id, to_node_id, relationship_type);

CREATE INDEX infrastructure_links_from_idx
  ON public.infrastructure_links (from_node_id);

CREATE INDEX infrastructure_links_to_idx
  ON public.infrastructure_links (to_node_id);

CREATE INDEX infrastructure_links_source_idx
  ON public.infrastructure_links (source_id);

CREATE INDEX infrastructure_links_public_idx
  ON public.infrastructure_links (from_node_id, to_node_id)
  WHERE is_verified = true AND is_published = true;

-- ---------------------------------------------------------------------------
-- Observations
-- ---------------------------------------------------------------------------

CREATE TABLE public.infrastructure_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  node_id uuid REFERENCES public.infrastructure_nodes (id) ON DELETE RESTRICT,
  link_id uuid REFERENCES public.infrastructure_links (id) ON DELETE RESTRICT,
  value numeric(18, 6),
  unit text,
  value_qualifier text NOT NULL DEFAULT 'exact',
  official_label text NOT NULL,
  measure_kind text NOT NULL,
  period_start date,
  period_end date,
  period_type text,
  period_label text,
  observation_scope text NOT NULL,
  methodology_scope text,
  source_id uuid NOT NULL REFERENCES public.sources (id) ON DELETE RESTRICT,
  evidence_classification text NOT NULL,
  evidence_statement text,
  limitations text NOT NULL,
  data_status text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infrastructure_observations_subject_xor CHECK (
    (node_id IS NOT NULL AND link_id IS NULL)
    OR (node_id IS NULL AND link_id IS NOT NULL)
  ),
  CONSTRAINT infrastructure_observations_qualifier_check CHECK (
    value_qualifier IN ('exact', 'about', 'more_than', 'less_than')
  ),
  CONSTRAINT infrastructure_observations_measure_check CHECK (
    measure_kind IN (
      'physical_extent',
      'equipment_count',
      'storage_volume',
      'monthly_loading',
      'wagon_rate',
      'wagon_count',
      'tonnage',
      'station_count',
      'siding_count',
      'project_capacity',
      'project_extent'
    )
  ),
  CONSTRAINT infrastructure_observations_period_type_check CHECK (
    period_type IS NULL OR period_type IN (
      'year',
      'month',
      'day',
      'partial_month',
      'historical',
      'project'
    )
  ),
  CONSTRAINT infrastructure_observations_period_check CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),
  CONSTRAINT infrastructure_observations_scope_check CHECK (
    observation_scope IN ('producer', 'named_node', 'named_direction')
  ),
  CONSTRAINT infrastructure_observations_class_check CHECK (
    evidence_classification IN (
      'QUANTITATIVE_VERIFIED',
      'HISTORICAL',
      'CONTEXT_ONLY',
      'PARTIAL'
    )
  ),
  CONSTRAINT infrastructure_observations_status_check CHECK (
    data_status IN ('official', 'company', 'plan')
  ),
  CONSTRAINT infrastructure_observations_no_national_check CHECK (
    observation_scope <> 'national'
  )
);

COMMENT ON TABLE public.infrastructure_observations IS
  'Количественные инфраструктурные наблюдения. Не дублирует production. Не национальные 600/951/586. Не выводит bottleneck/spare capacity.';

COMMENT ON COLUMN public.infrastructure_observations.measure_kind IS
  'Тип измерения первоисточника. monthly_loading и wagon_rate не являются годовой пропускной способностью.';

COMMENT ON COLUMN public.infrastructure_observations.evidence_classification IS
  'QUANTITATIVE_VERIFIED — текущее операционное/структурное число. HISTORICAL/PARTIAL/CONTEXT_ONLY — не текущая мощность.';

CREATE INDEX infrastructure_observations_node_idx
  ON public.infrastructure_observations (node_id);

CREATE INDEX infrastructure_observations_link_idx
  ON public.infrastructure_observations (link_id);

CREATE INDEX infrastructure_observations_source_idx
  ON public.infrastructure_observations (source_id);

CREATE INDEX infrastructure_observations_measure_period_idx
  ON public.infrastructure_observations (measure_kind, period_start);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.infrastructure_nodes
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.infrastructure_links
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.infrastructure_observations
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.infrastructure_nodes TO anon, authenticated;
GRANT SELECT ON TABLE public.infrastructure_links TO anon, authenticated;
GRANT SELECT ON TABLE public.infrastructure_observations TO anon, authenticated;

ALTER TABLE public.infrastructure_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY infrastructure_nodes_public_read ON public.infrastructure_nodes
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY infrastructure_links_public_read ON public.infrastructure_links
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);

CREATE POLICY infrastructure_observations_public_read ON public.infrastructure_observations
  FOR SELECT TO anon, authenticated
  USING (is_verified = true AND is_published = true);
