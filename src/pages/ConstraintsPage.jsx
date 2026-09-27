import { Link } from 'react-router-dom'
import { getConstraints } from '../api/marketApi'
import { CLEAN_COAL_TECH, NATIONAL_CAPACITY_SPLIT } from '../data/constraintsConfig'
import { NoData, PageHeader, QuietSource, StateBlock } from '../components/ui'
import { useMarketData } from '../hooks/useMarketData'
import { formatNumber, formatQualifiedNumber } from '../lib/format'

function metricText(item, digits) {
  if (!item || item.value == null) return null
  return formatQualifiedNumber(item.value, item.value_qualifier, item.approx, digits)
}

function TypeBadge({ type }) {
  const map = {
    limitation: 'Ограничение',
    challenge: 'Задача',
    fact: 'Структурный факт',
    longrisk: 'Долгосрочный риск',
    operations: 'Задача / операционный контур',
  }
  return <span className={`constraint-badge is-${type}`}>{map[type]}</span>
}

function FactValue({ value, unit, sourceId }) {
  return (
    <p className="companies-kpi-value is-numeric">
      <span className="companies-kpi-number">{value}</span>
      {unit ? <span className="companies-kpi-unit">{unit}</span> : null}
      <QuietSource sourceId={sourceId} />
    </p>
  )
}

export function ConstraintsPage() {
  const { data, loading, error, reload } = useMarketData(getConstraints)
  const outlook = data?.outlook
  const demand = outlook?.industryOutlook?.additionalDemand
  const gondolas = outlook?.industryOutlook?.gondolas
  const rail = outlook?.industryOutlook?.railMeasure
  const actual = outlook?.trajectory?.actualExtraction
  const plan = outlook?.trajectory?.plannedExtraction
  const investFact = outlook?.trajectory?.investmentFact
  const investExpect = outlook?.trajectory?.investmentExpectation
  const capacity = data?.generation?.capacity
  const splitTotal = NATIONAL_CAPACITY_SPLIT.newGw + NATIONAL_CAPACITY_SPLIT.modernizeGw
  const newPct = (NATIONAL_CAPACITY_SPLIT.newGw / splitTotal) * 100
  const geo = data?.geography
  const exp = data?.exportYtd
  const heating = outlook?.heating
  const bogatyr = outlook?.bogatyrCase
  const shubarkol = outlook?.producerCase
  const chemistry = outlook?.chemistry
  const projects = data?.generation?.projects || []

  return (
    <section className="constraints-page">
      <PageHeader
        title="Ограничения и задачи"
        description="Факторы развития угольной отрасли Казахстана: производство, логистика, регулирование и долгосрочная трансформация."
      />
      <p className="outlook-hint">Факты и официальные ориентиры не являются прогнозом наступления риска.</p>

      <StateBlock loading={loading} error={error} empty={!loading && !data} skeleton="content" onRetry={reload}>
        {data ? (
          <>
            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Контекст</p>
                  <h2>Два горизонта отрасли</h2>
                </div>
              </header>
              <div className="constraints-horizon">
                <article className="outlook-exec-card">
                  <TypeBadge type="challenge" />
                  <p className="outlook-kicker">2026–2030</p>
                  <h3>Расширение и модернизация</h3>
                  {demand ? (
                    <>
                      <FactValue
                        value={metricText(demand)}
                        unit={demand.unit}
                        sourceId={demand.sourceId}
                      />
                      <p className="outlook-hint">{demand.label}</p>
                    </>
                  ) : (
                    <NoData />
                  )}
                  {capacity ? (
                    <div className="constraints-split-note">
                      <FactValue
                        value={metricText(capacity, 1)}
                        unit={capacity.unit}
                        sourceId={capacity.sourceId}
                      />
                      <p className="outlook-hint">угольной генерации: новые объекты и модернизация действующих</p>
                      <p className="outlook-hint">
                        {formatNumber(NATIONAL_CAPACITY_SPLIT.newGw, 1)} ГВт новых объектов +{' '}
                        {formatNumber(NATIONAL_CAPACITY_SPLIT.modernizeGw, 1)} ГВт модернизации.{' '}
                        <QuietSource sourceId={NATIONAL_CAPACITY_SPLIT.sourceId} />
                      </p>
                    </div>
                  ) : (
                    <NoData />
                  )}
                  {plan ? (
                    <>
                      <FactValue value={metricText(plan, 1)} unit={plan.unit} sourceId={plan.sourceId} />
                      <p className="outlook-hint">план добычи угля на {plan.period}</p>
                    </>
                  ) : (
                    <NoData />
                  )}
                  <p className="outlook-lead">
                    Среднесрочный официальный контур предполагает рост и модернизацию, а не отказ от угля.
                  </p>
                </article>
                <div className="constraints-horizon-rule" aria-hidden="true">
                  <span>2030</span>
                  <span>2060</span>
                </div>
                <article className="outlook-exec-card">
                  <TypeBadge type="longrisk" />
                  <p className="outlook-kicker">До 2060</p>
                  <h3>Долгосрочная трансформация</h3>
                  <p className="outlook-lead">
                    Стратегия углеродной нейтральности предусматривает поэтапное снижение доли угольной
                    генерации, рост ВИЭ и альтернативной энергии, а также использование природного газа как
                    переходного топлива.
                    <QuietSource sourceId="decreeCarbonNeutral2060" />
                  </p>
                  <p className="outlook-hint">Указ Президента РК № 121 от 02.02.2023.</p>
                </article>
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Синхронизация</p>
                  <h2>Генерация → уголь → транспорт</h2>
                </div>
                <TypeBadge type="challenge" />
              </header>
              <ol className="constraints-chain">
                <li>
                  <FactValue
                    value={capacity ? metricText(capacity, 1) : '—'}
                    unit={capacity?.unit}
                    sourceId={capacity?.sourceId}
                  />
                  <p>угольная программа</p>
                </li>
                <li>
                  <FactValue
                    value={demand ? metricText(demand) : '—'}
                    unit={demand?.unit}
                    sourceId={demand?.sourceId}
                  />
                  <p>дополнительный спрос на энергетический уголь к 2030</p>
                </li>
                <li>
                  <FactValue
                    value={gondolas ? metricText(gondolas, 0) : '—'}
                    unit={gondolas?.unit}
                    sourceId={gondolas?.sourceId}
                  />
                  <p>дополнительная потребность в обеспечении полувагонами</p>
                </li>
                <li>
                  <p className="companies-kpi-value">
                    <span className="companies-kpi-number">модернизация</span>
                    {rail?.sourceId ? <QuietSource sourceId={rail.sourceId} /> : (
                      <QuietSource sourceId="primeMinisterCoalGenApproved" />
                    )}
                  </p>
                  <p>железнодорожной инфраструктуры</p>
                </li>
              </ol>
              <p className="outlook-callout">
                {gondolas
                  ? `${metricText(gondolas, 0)} ${gondolas.unit}`
                  : 'Показатель полувагонов'}{' '}
                — транспортная потребность, указанная в материалах Нацпроекта. Это не размер существующего
                парка полувагонов.
              </p>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Нацпроект</p>
                  <h2>Структура 7,8 ГВт</h2>
                </div>
                <TypeBadge type="challenge" />
              </header>
              <p className="outlook-hint">
                Структура программы, не прогноз выработки. Объекты не привязываются к конкретному разрезу.
              </p>
              <div
                className="constraints-stack"
                role="img"
                aria-label={`${formatNumber(NATIONAL_CAPACITY_SPLIT.newGw, 1)} гигаватт новые объекты, ${formatNumber(NATIONAL_CAPACITY_SPLIT.modernizeGw, 1)} гигаватт модернизация`}
              >
                <span className="is-new" style={{ width: `${newPct}%` }} />
                <span className="is-mod" style={{ width: `${100 - newPct}%` }} />
              </div>
              <ul className="constraints-stack-legend">
                <li className="is-new">
                  <i aria-hidden="true" />
                  {formatNumber(NATIONAL_CAPACITY_SPLIT.newGw, 1)} ГВт новые
                </li>
                <li className="is-mod">
                  <i aria-hidden="true" />
                  {formatNumber(NATIONAL_CAPACITY_SPLIT.modernizeGw, 1)} ГВт модернизация
                </li>
              </ul>
              <p className="outlook-hint">
                {data.generation.newCount
                  ? `${formatNumber(data.generation.newCount.value, 0)} новых объектов`
                  : 'новые объекты'}
                {' · '}
                {data.generation.modernizeCount
                  ? `${formatNumber(data.generation.modernizeCount.value, 0)} действующих`
                  : 'действующие объекты'}
                <QuietSource sourceId={NATIONAL_CAPACITY_SPLIT.sourceId} />
              </p>
              {projects.length ? (
                <ul className="exports-chip-list">
                  {projects.map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}</strong>
                      <span>
                        {item.capacity_mw != null
                          ? `${formatNumber(item.capacity_mw, 0)} МВт`
                          : 'мощность не указана'}
                        {item.location_name ? ` · ${item.location_name}` : ''}
                      </span>
                      <QuietSource sourceId={item.sourceId} />
                    </li>
                  ))}
                </ul>
              ) : (
                <NoData />
              )}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Добыча</p>
                  <h2>Масштабирование добычи</h2>
                </div>
                <TypeBadge type="challenge" />
              </header>
              <div className="constraints-two">
                <article className="outlook-exec-card">
                  <p className="outlook-metric-caption">2025 факт</p>
                  {actual ? (
                    <FactValue value={metricText(actual, 0)} unit={actual.unit} sourceId={actual.sourceId} />
                  ) : (
                    <NoData />
                  )}
                  <p className="outlook-metric-caption">2026 план</p>
                  {plan ? (
                    <FactValue value={metricText(plan, 1)} unit={plan.unit} sourceId={plan.sourceId} />
                  ) : (
                    <NoData />
                  )}
                  <p className="outlook-hint">
                    Плановый ориентир на 2026 год; не показатель фактического роста или выполнения.
                  </p>
                </article>
                <article className="outlook-exec-card">
                  <p className="outlook-metric-caption">Инвестиции 2025 факт</p>
                  {investFact ? (
                    <FactValue
                      value={metricText(investFact, 0)}
                      unit={investFact.unit}
                      sourceId={investFact.sourceId}
                    />
                  ) : (
                    <NoData />
                  )}
                  <p className="outlook-metric-caption">2026 ожидание / план</p>
                  {investExpect ? (
                    <FactValue
                      value={metricText(investExpect, 0)}
                      unit={investExpect.unit}
                      sourceId={investExpect.sourceId}
                    />
                  ) : (
                    <NoData />
                  )}
                  <p className="outlook-lead">
                    Официальный контур предусматривает увеличение объёма инвестиций одновременно с
                    расширением и модернизацией отрасли.
                  </p>
                </article>
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Предприятия</p>
                  <h2>Корпоративные программы</h2>
                </div>
                <TypeBadge type="challenge" />
              </header>
              <p className="outlook-hint">
                Инвестиции предприятий не суммируются с отраслевыми 305 / ≈553 млрд тг: это разные контуры.
              </p>
              <div className="constraints-two">
                <article className="outlook-exec-card">
                  <h3>Богатырь Комир</h3>
                  <ul className="constraints-plain-list">
                    <li>
                      {bogatyr?.actual ? metricText(bogatyr.actual, 1) : '—'} {bogatyr?.actual?.unit} — 2024 факт
                      <QuietSource sourceId={bogatyr?.actual?.sourceId} />
                    </li>
                    <li>
                      {bogatyr?.plan ? metricText(bogatyr.plan, 1) : '—'} {bogatyr?.plan?.unit} — 2026 план
                      <QuietSource sourceId={bogatyr?.plan?.sourceId} />
                    </li>
                    <li>
                      {bogatyr?.target ? metricText(bogatyr.target, 1) : '—'} {bogatyr?.target?.unit} — 2032 цель
                      <QuietSource sourceId={bogatyr?.target?.sourceId} />
                    </li>
                    <li>
                      {bogatyr?.investment ? metricText(bogatyr.investment, 0) : '—'} {bogatyr?.investment?.unit} —
                      инвестиции до 2032
                      <QuietSource sourceId={bogatyr?.investment?.sourceId} />
                    </li>
                  </ul>
                </article>
                <article className="outlook-exec-card">
                  <h3>Шубарколь Комир</h3>
                  <ul className="constraints-plain-list">
                    <li>
                      {shubarkol?.plan ? metricText(shubarkol.plan, 1) : '—'} {shubarkol?.plan?.unit} — план 2026
                      <QuietSource sourceId={shubarkol?.plan?.sourceId} />
                    </li>
                    <li>
                      {shubarkol?.investmentParent ? metricText(shubarkol.investmentParent, 1) : '—'}{' '}
                      {shubarkol?.investmentParent?.unit} — стратегия 2026–2032
                      <QuietSource sourceId={shubarkol?.investmentParent?.sourceId} />
                    </li>
                    {shubarkol?.investmentParts?.map((item) => (
                      <li key={item.id}>
                        {metricText(item, 1)} {item.unit} — {item.label}
                        <QuietSource sourceId={item.sourceId} />
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
              <p className="outlook-hint">
                <Link to="/companies">Подробнее → Компании и добыча</Link>
              </p>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Рынок</p>
                  <h2>Структурная концентрация</h2>
                </div>
              </header>
              <div className="constraints-two">
                <article className="outlook-exec-card">
                  <TypeBadge type="fact" />
                  <h3>География добычи</h3>
                  {geo?.ok && geo.twoRegionShare != null ? (
                    <>
                      <FactValue
                        value={`≈ ${formatNumber(geo.twoRegionShare, 1)}`}
                        unit="%"
                        sourceId={geo.sourceId}
                      />
                      <p className="outlook-lead">
                        Павлодарская + Карагандинская области в промышленной серии БНС за 2025 год.
                      </p>
                      <p className="outlook-hint">
                        Расчёт Coal Monitor KZ на основе промышленной статистики БНС.
                      </p>
                    </>
                  ) : (
                    <NoData text={geo?.error || 'Нет подтвержденных данных'} />
                  )}
                  <p className="outlook-hint">
                    <Link to="/geography">Подробнее → География и структура добычи</Link>
                  </p>
                </article>
                <article className="outlook-exec-card">
                  <TypeBadge type="fact" />
                  <h3>География экспорта</h3>
                  <p className="outlook-hint">Январь–июль 2026, ТН ВЭД 2701</p>
                  {exp?.ok && exp.russiaShare != null ? (
                    <>
                      <p>
                        Россия: {formatNumber(exp.russiaShare, 2)}%
                        <QuietSource sourceId={exp.russiaSourceId} />
                      </p>
                      {exp.top3 ? <p>Top-3: {formatNumber(exp.top3.share, 2)}%</p> : null}
                      {exp.top5 ? <p>Top-5: {formatNumber(exp.top5.share, 2)}%</p> : null}
                      <p className="outlook-hint">
                        Расчёт Coal Monitor KZ на основе БНС, январь–июль 2026, ТН ВЭД 2701.
                      </p>
                      <p className="outlook-hint">
                        Страна-партнёр во внешнеторговой статистике не обязательно является конечным
                        потребителем.
                      </p>
                    </>
                  ) : (
                    <NoData text={exp?.error || 'Нет подтвержденных данных'} />
                  )}
                  <p className="outlook-hint">
                    <Link to="/exports">Подробнее → Экспорт и внешние рынки</Link>
                  </p>
                </article>
              </div>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Регулятор</p>
                  <h2>Экологическое регулирование и модернизация</h2>
                </div>
                <TypeBadge type="limitation" />
              </header>
              <div className="constraints-two">
                <article className="outlook-exec-card">
                  <h3>НДТ</h3>
                  <p>Наилучшие доступные техники</p>
                  <QuietSource sourceId="ndtCoalMining" />
                </article>
                <article className="outlook-exec-card">
                  <h3>КЭР</h3>
                  <p>Комплексные экологические разрешения</p>
                  <QuietSource sourceId="ecologicalCodeKz" />
                </article>
              </div>
              <p className="outlook-lead">
                Для нового угольного строительства в материалах Нацпроекта предусмотрены современные
                природоохранные технологии:
                <QuietSource sourceId="primeMinisterCoalGenApproved" />
              </p>
              <ul className="exports-chip-list">
                {CLEAN_COAL_TECH.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Внутренний рынок</p>
                  <h2>Отопительный сезон</h2>
                </div>
                <TypeBadge type="operations" />
              </header>
              {heating ? (
                <>
                  <p className="outlook-hint">{heating.program?.horizon || '2026–2027'}</p>
                  {heating.total ? (
                    <FactValue
                      value={metricText(heating.total, 1)}
                      unit={heating.total.unit}
                      sourceId={heating.total.sourceId}
                    />
                  ) : (
                    <NoData />
                  )}
                  <p className="outlook-metric-caption">предварительная потребность</p>
                  <ul className="constraints-plain-list">
                    {heating.infrastructure.map((item) => (
                      <li key={item.id}>
                        {metricText(item, 0)} {item.unit} — {item.label}
                        <QuietSource sourceId={item.sourceId} />
                      </li>
                    ))}
                  </ul>
                  <p className="outlook-hint">
                    Планирование сезонного обеспечения не означает наличие дефицита. Показатель не смешивается
                    с внутренним направлением угля за календарный 2025 год.
                  </p>
                </>
              ) : (
                <NoData />
              )}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Продукт</p>
                  <h2>Диверсификация использования угля</h2>
                </div>
                <TypeBadge type="challenge" />
              </header>
              <p className="outlook-lead">
                Минэнерго рассматривает углехимию как одно из направлений модернизации и производства продукции
                с более высокой добавленной стоимостью.
                <QuietSource sourceId={chemistry?.program?.sourceId} />
              </p>
              {chemistry?.directions?.length ? (
                <ul className="exports-chip-list">
                  {chemistry.directions.map((item) => (
                    <li key={item.id}>
                      {item.name}
                      <QuietSource sourceId={item.sourceId} />
                    </li>
                  ))}
                </ul>
              ) : (
                <NoData />
              )}
            </section>

            <section className="outlook-section">
              <header className="outlook-section-head">
                <div>
                  <p className="outlook-kicker">Методология</p>
                  <h2>Границы интерпретации</h2>
                </div>
              </header>
              <p className="outlook-hint">Нет подтверждения:</p>
              <ul className="constraints-plain-list">
                <li>дефицита угля к 2030;</li>
                <li>того, что железная дорога является «главным» ограничением отрасли;</li>
                <li>необходимости именно 600 новых вагонов;</li>
                <li>«критической зависимости» отрасли от России;</li>
                <li>планов полного отказа Казахстана от угля.</li>
              </ul>
            </section>
          </>
        ) : null}
      </StateBlock>
    </section>
  )
}
