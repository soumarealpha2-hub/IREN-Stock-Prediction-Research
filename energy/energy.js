'use strict';

const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const reportedUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fields = {
  revenueB: 'Revenue',
  netIncomeB: 'Net income',
  operatingCashFlowB: 'Operating cash flow',
  debtB: 'Gross debt',
  capexB: 'Capital expenditures',
  freeCashFlowB: 'Free cash flow',
};
const cases = ['bear', 'base', 'bull'];
const label = key => key[0].toUpperCase() + key.slice(1);
const format = (value, formatter = number) => Number.isFinite(value) ? formatter.format(value) : '—';
const missing = 'Undisclosed';
const finalYear = 2030;

function element(tag, { className, text, ...attributes } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}

function sourceLink(source) {
  if (!source) return '';
  const url = typeof source === 'string' ? source : source.url;
  if (!url?.startsWith('https://')) return '';
  return element('a', {
    className: 'source-link', href: url, text: source.label || 'Source',
    target: '_blank', rel: 'noopener noreferrer',
  });
}

function sourceLinks(sources) {
  return sources.filter(Boolean).map(source => element('div', {}, [sourceLink(source)]));
}

function note(text) {
  return element('p', { className: 'note', text });
}

function table(caption, headings, values, numeric = []) {
  const heading = element('tr', {}, headings.map((text, index) => element('th', {
    scope: 'col', className: numeric.includes(index) ? 'number' : undefined, text,
  })));
  const rows = values.map(values => element('tr', {}, values.map((value, index) => element(index === 0 ? 'th' : 'td', {
    ...(index === 0 && { scope: 'row' }),
    className: numeric.includes(index) ? 'number' : undefined,
  }, [value ?? '—']))));
  return element('div', { className: 'table-scroll', role: 'region', 'aria-label': caption, tabindex: '0' }, [
    element('table', {}, [
      element('caption', { text: caption }),
      element('thead', {}, [heading]),
      element('tbody', {}, rows),
    ]),
  ]);
}

function identity(name, logo, heading = 'span') {
  const brand = element('div', { className: 'identity' }, [element(heading, { text: name })]);
  const images = (Array.isArray(logo) ? logo : [logo]).filter(path =>
    path && /^\/?(?:energy\/logos|assets\/institutions)\//.test(path) && !path.includes('..')
  ).map(path => {
    const image = element('img', { alt: '', width: 78, height: 26, loading: 'lazy' });
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = '/' + path.replace(/^\//, '');
    return image;
  });
  brand.prepend(...images);
  return brand;
}

function topic(title, body, sources = []) {
  return element('article', { className: 'topic' }, [
    element('h3', { text: title }),
    element('p', { text: body }),
    ...sourceLinks(sources),
  ]);
}

function renderSector(sector) {
  $('energy-sector-metrics').replaceChildren(...sector.metrics.map(metric => element('article', { className: 'summary-card' }, [
    element('h3', { text: metric.label }),
    element('strong', { text: metric.value }),
    element('p', { text: metric.note }),
    ...sourceLinks([metric.source, ...(metric.sources || [])]),
  ])));
  const series = (sector.demandSeries || []).map(row => ({
    name: row.year + ' ' + row.kind,
    value: row.twh,
    projected: row.kind === 'projection',
  }));
  const chartSource = (sector.sources || []).find(source => source.label.includes('Table A.4'));
  $('energy-demand-chart').replaceChildren(
    barChart('Global data center electricity consumption · TWh per year', series, 'Demand history is unavailable.'),
    sourceLink(chartSource),
  );
  $('energy-sector-topics').replaceChildren(...sector.topics.map(item =>
    topic(item.title, item.body, [item.source, ...(item.sources || [])])));
}

function renderBusiness(company) {
  const cards = [];
  if (company.advantages?.length) cards.push(topic('Competitive advantages', company.advantages.join(' ')));
  if (company.marketShare) cards.push(topic('Market position', company.marketShare));
  if (company.supplyConstraints) cards.push(topic('Supply constraints', company.supplyConstraints));
  $('energy-business').replaceChildren(
    identity(company.name, company.logo, 'h3'),
    element('p', { className: 'note', text: company.segment }),
    element('p', { text: company.overview }),
    element('div', { className: 'topic-grid' }, cards),
  );
}

function barChart(title, rows, unavailable) {
  if (!rows.length) return note(unavailable);
  const high = Math.max(0, ...rows.map(row => row.value));
  const low = Math.min(0, ...rows.map(row => row.value));
  const range = high - low || 1;
  const zero = (0 - low) / range * 100;

  return element('div', { className: 'chart' }, [
    element('h4', { text: title }),
    ...rows.map(({ name, value, projected }) => {
      const left = (Math.min(0, value) - low) / range * 100;
      const width = (Math.abs(value) / range) * 100;
      const barClass = value < 0 ? ' negative' : projected ? ' projected' : '';
      return element('div', { className: 'chart-row' }, [
        element('span', { text: name }),
        element('div', { className: 'chart-track', style: '--zero:' + zero + '%', 'aria-hidden': 'true' }, [
          element('span', { className: 'chart-bar' + barClass, style: '--left:' + left + '%;--width:' + width + '%' }),
        ]),
        element('span', { text: format(value) }),
      ]);
    }),
  ]);
}

function renderFinancials(company) {
  const financials = company.financials || [];
  const metric = $('energy-metric-select').value;
  const currency = company.currency || financials.find(row => row.currency)?.currency || 'USD';
  const annual = financials.filter(row => row.periodType !== 'quarter');
  const chartRows = annual.filter(row => Number.isFinite(row[metric]));
  $('energy-chart').replaceChildren(barChart(
    fields[metric] + ' · fiscal years · ' + currency + ' billions',
    chartRows.map(row => ({ name: row.period, value: row[metric] })),
    'Annual values for this metric are unavailable.',
  ));

  const financialRows = financials.map(row => {
    const growth = revenueGrowth(row, financials);
    const margin = row.netMarginPct ?? (Number.isFinite(row.netIncomeB) && row.revenueB > 0 ? row.netIncomeB / row.revenueB * 100 : null);
    return [
      row.period,
      ...Object.keys(fields).map(key => format(row[key])),
      Number.isFinite(growth) ? format(growth) + '%' : '—',
      Number.isFinite(margin) ? format(margin) + '%' : '—',
      element('div', {}, sourceLinks([row.source, ...(row.sources || [])])),
    ];
  });
  const notes = financials.filter(row => row.note || row.notes).map(row => note(row.period + ' · ' + (row.note || row.notes)));
  $('energy-financial-table').replaceChildren(
    table(currency + ' billions unless marked %. Fiscal year and quarter are shown as reported. Dashes indicate unavailable or inapplicable figures.', [
      'Period', ...Object.values(fields), 'Revenue YoY', 'Net margin', 'Filing or report',
    ], financialRows, [1, 2, 3, 4, 5, 6, 7, 8]),
    ...(company.financialNote ? [note(company.financialNote)] : []),
    ...notes,
  );
}

function revenueGrowth(row, financials) {
  if (Number.isFinite(row.revenueGrowthPct)) return row.revenueGrowthPct;
  const year = Number(String(row.period).match(/20\d{2}/)?.[0]);
  const previous = financials.find(candidate => candidate.period === String(row.period).replace(String(year), year - 1));
  if (!Number.isFinite(row.revenueB) || !previous || !(previous.revenueB > 0)) return null;
  return (row.revenueB / previous.revenueB - 1) * 100;
}

function sharePrice(valuation, scenario, year = finalYear) {
  const multiple = scenario.multiple;
  if (Number.isFinite(scenario.revenueB) && Number.isFinite(scenario.netCashB) && scenario.sharesM > 0) {
    return Math.max(0, 1000 * (scenario.revenueB * multiple + scenario.netCashB) / scenario.sharesM);
  }
  if (!Number.isFinite(valuation.baseMetric) || !Number.isFinite(scenario.growthPct) || !Number.isFinite(multiple)) {
    return Number.isFinite(scenario) ? scenario : scenario.price ?? null;
  }
  return valuation.baseMetric * (1 + scenario.growthPct / 100) ** (year - valuation.baseYear) * multiple;
}

function valuationControl(key, text, min, max, step) {
  const input = element('input', { id: 'energy-' + key, type: 'number', min, max, step });
  return { input, label: element('label', {}, [element('span', { text }), input]) };
}

function scenarioCards(valuation) {
  return cases.map(name => {
    const scenario = valuation.scenarios[name];
    return element('article', { className: 'scenario', 'data-scenario-card': name }, [
      element('h4', { text: label(name) + ' case' }),
      element('output', { text: format(sharePrice(valuation, scenario), usd) }),
      element('p', { text: scenario.reason || '' }),
      Number.isFinite(scenario.growthPct) ? note(number.format(scenario.growthPct) + '% annual growth · ' + number.format(scenario.multiple) + '× multiple') : '',
      Number.isFinite(scenario.operationalMw) ? note(number.format(scenario.operationalMw) + ' MW in operation · ' + number.format(scenario.multiple) + '× sales') : '',
    ]);
  });
}

function renderValuation(valuation) {
  const target = $('energy-model');
  if (!valuation?.scenarios || cases.some(name => valuation.scenarios[name] == null)) {
    target.replaceChildren(note('Comparable valuation scenarios are unavailable.'));
    return;
  }
  const operatingModel = Number.isFinite(valuation.scenarios.base.revenueB);
  const growthModel = Number.isFinite(valuation.scenarios.base.growthPct);
  const summary = element('div', {}, [
    note(valuation.method + (valuation.unit ? ' · ' + valuation.unit : '')),
    ...(valuation.baseMetricLabel ? [note(valuation.baseYear + ' starting basis · ' + valuation.baseMetricLabel + ' · ' + format(valuation.baseMetric))] : []),
    note(valuation.disclaimer || 'Illustrative assumptions. The model excludes dividends and expresses outcomes in nominal USD per share.'),
    ...(valuation.assumptions ? [note(valuation.assumptions)] : []),
    ...sourceLinks([valuation.source, ...(valuation.sources || [])]),
    element('div', { className: 'scenario-grid' }, scenarioCards(valuation)),
  ]);
  if (!operatingModel && !growthModel) {
    target.replaceChildren(summary);
    return;
  }

  const multiple = valuationControl('multiple', 'Exit multiple (×)', 0, 120, 'any');
  const growth = valuationControl('growth', 'Annual growth (%)', -100, 200, 'any');
  const sales = valuationControl('sales', '2030 revenue (USD billions)', 0, 500, 'any');
  const cash = valuationControl('cash', '2030 net cash (USD billions)', -500, 500, 'any');
  const shares = valuationControl('shares', 'Diluted shares (millions)', 1, 10000, 'any');
  const controls = operatingModel ? { revenueB: sales, multiple, netCashB: cash, sharesM: shares } : { growthPct: growth, multiple };
  const inputs = Object.values(controls).map(control => control.input);
  const modelResult = element('output', { className: 'model-result', id: 'energy-valuation-result', for: inputs.map(input => input.id).join(' ') });
  const projections = element('div');
  const buttons = cases.map(name => element('button', { type: 'button', text: label(name), 'data-scenario': name, 'aria-pressed': 'false' }));

  function update() {
    if (inputs.some(input => !input.validity.valid || !Number.isFinite(input.valueAsNumber))) {
      modelResult.textContent = 'Enter a value within each input’s range.';
      projections.replaceChildren();
      return;
    }
    const custom = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.input.valueAsNumber]));
    modelResult.textContent = '2030 modeled price · ' + format(sharePrice(valuation, custom), usd);
    if (growthModel && valuation.baseYear < finalYear) {
      const start = Math.max(2026, valuation.baseYear);
      projections.replaceChildren(table('Nominal modeled USD per share. Uses the selected exit multiple in each year.', [
        'Year', 'Bear', 'Base', 'Bull', 'Selected assumptions',
      ], Array.from({ length: finalYear - start + 1 }, (_, i) => {
        const year = start + i;
        return [String(year), ...cases.map(name => format(sharePrice(valuation, valuation.scenarios[name], year), usd)), format(sharePrice(valuation, custom, year), usd)];
      }), [1, 2, 3, 4]));
    }
  }

  function selectScenario(name) {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scenario === name)));
    summary.querySelectorAll('[data-scenario-card]').forEach(card =>
      card.setAttribute('aria-current', String(card.dataset.scenarioCard === name)));
    if (name) {
      const scenario = valuation.scenarios[name];
      Object.entries(controls).forEach(([key, control]) => { control.input.value = scenario[key]; });
    }
    update();
  }

  buttons.forEach(button => button.addEventListener('click', () => selectScenario(button.dataset.scenario)));
  inputs.forEach(input => input.addEventListener('input', () => selectScenario(null)));
  target.replaceChildren(summary,
    element('div', { className: 'scenario-buttons', 'aria-label': 'Load scenario assumptions' }, buttons),
    element('div', { className: 'model-controls' }, Object.values(controls).map(control => control.label)),
    modelResult, projections);
  selectScenario('base');
}

const dealFields = {
  value: 'Contract value',
  capacity: 'Capacity or volume',
  duration: 'Duration',
  expiration: 'Expiration',
  expectedRevenue: 'Expected revenue',
  timeline: 'Delivery or milestone',
};

function renderContracts(contracts) {
  const target = $('energy-contracts-content');
  if (!contracts.length) {
    target.replaceChildren(note('No agreements are included in this research snapshot.'));
    return;
  }
  target.replaceChildren(element('div', { className: 'contract-list' }, contracts.map(deal =>
    element('article', { className: 'topic' }, [
      identity(deal.customer, deal.logos || deal.logo),
      element('h4', { text: deal.title }),
      element('p', { className: 'deal-status', text: [deal.status, deal.announcementDate].filter(Boolean).join(' · ') }),
      element('dl', {}, Object.entries(dealFields).flatMap(([key, heading]) => [
        element('dt', { text: heading }), element('dd', { text: deal[key] || missing }),
      ])),
      deal.notes ? note(deal.notes) : '',
      ...sourceLinks([deal.source, ...(deal.sources || [])]),
    ]))));
}

function renderOwnership(ownership, ownershipNotes) {
  const target = $('energy-ownership-content');
  if (!ownership.length) {
    target.replaceChildren(note('Verified holdings are unavailable for this company in the current snapshot.'));
    return;
  }
  const sortedHolders = [...ownership].sort((a, b) => (b.shares ?? -1) - (a.shares ?? -1));
  const rows = sortedHolders.map(holder => [
    identity(holder.manager, holder.logo),
    format(holder.shares, whole),
    Number.isFinite(holder.ownershipPct) ? number.format(holder.ownershipPct) + '%' : '—',
    format(holder.reportedValue, reportedUsd),
    Number.isFinite(holder.changeShares) && holder.changeShares > 0 ? '+' + whole.format(holder.changeShares) : format(holder.changeShares, whole),
    [holder.period, holder.filedDate ? 'Filed ' + holder.filedDate : null].filter(Boolean).join(' · '),
    element('div', {}, [
      ...sourceLinks([holder.source, holder.previousSource, holder.denominatorSource]),
      ...(holder.denominatorShares && holder.denominatorDate ? [
        note(whole.format(holder.denominatorShares) + ' outstanding · ' + holder.denominatorDate),
      ] : []),
    ]),
  ]);
  const methodology = Array.isArray(ownershipNotes) ? ownershipNotes : ownershipNotes ? [ownershipNotes] : [
    'Rows are ordered by shares among reviewed managers. Form 13F reports quarter-end long positions, which can include client assets. Affiliated Vanguard managers are shown separately and positions may overlap.',
    'Percentages divide reported common shares by issuer-reported shares outstanding. Share changes compare June 30, 2026 positions where the same reporting scope was available. Options and other share classes are excluded.',
  ];
  target.replaceChildren(...methodology.map(note),
    table('Historical positions. Values are reported in USD.', [
      'Institution', 'Shares', '% outstanding', 'Position value', 'Share change', 'Reporting date', 'Filings',
    ], rows, [1, 2, 3, 4]));
}

function renderRisks(company) {
  const risks = company.risks || [];
  $('energy-risks-content').replaceChildren(risks.length ?
    element('ul', { className: 'risk-list' }, risks.map(text => element('li', { text }))) :
    note('Risk factors are available in the company filings.'));
}

function renderComparison(companies, changeCompany) {
  const rows = Object.entries(companies).map(([ticker, company]) => {
    const annual = (company.financials || []).filter(row => row.periodType !== 'quarter');
    const latest = annual.reduce((result, row) => !result || String(row.period).localeCompare(String(result.period)) > 0 ? row : result, null);
    const button = element('button', { type: 'button', text: ticker });
    button.addEventListener('click', () => {
      changeCompany(ticker);
      $('energy-company-select').focus({ preventScroll: true });
      $('energy-profile').scrollIntoView();
    });
    const currency = latest?.currency || company.currency || 'USD';
    const scenario = company.valuation?.scenarios?.base;
    return [
      button, company.name, company.segment || '—',
      latest?.period ?? '—',
      currency,
      format(latest?.revenueB),
      format(latest?.netIncomeB),
      format(latest?.operatingCashFlowB),
      format(latest?.debtB),
      scenario != null ? format(sharePrice(company.valuation, scenario), usd) : '—',
    ];
  });
  $('energy-comparison-note').textContent = 'Reported financial figures use each company’s filing currency. Valuation scenarios use nominal USD per share.';
  $('energy-comparison-content').replaceChildren(table('Latest fiscal year in this dataset. Financial figures are in billions.', [
    'Symbol', 'Company', 'Business', 'Period', 'Currency', 'Revenue', 'Net income', 'Operating cash flow', 'Gross debt', '2030 base case',
  ], rows, [5, 6, 7, 8, 9]));
}

function renderDealDatabase(contracts, filter) {
  const needle = filter.trim().toLowerCase();
  const rows = Object.entries(contracts).flatMap(([ticker, deals]) => deals.filter(deal =>
    [ticker, deal.customer, deal.title, deal.status].some(value => value?.toLowerCase().includes(needle))
  ).map(deal => [
    ticker, identity(deal.customer, deal.logos || deal.logo), deal.title, deal.status, deal.capacity || missing,
    deal.value || missing, deal.duration || missing, deal.expiration || missing,
    deal.expectedRevenue || missing, deal.timeline || missing, sourceLink(deal.source),
  ]));
  $('energy-deal-content').replaceChildren(rows.length ? table(rows.length + ' agreements and proposals', [
    'Symbol', 'Counterparty', 'Project', 'Status', 'Capacity or volume', 'Contract value', 'Duration', 'Expiration', 'Expected revenue', 'Delivery or milestone', 'Source',
  ], rows) : note('No contracts match your search.'));
}

function sourceGroup(title, sources) {
  const unique = new Map();
  for (const source of sources.filter(Boolean)) {
    const url = typeof source === 'string' ? source : source.url;
    if (url?.startsWith('https://') && !unique.has(url)) unique.set(url, source);
  }
  return element('article', { className: 'topic' }, [
    element('h3', { text: title }),
    element('ul', { className: 'sources-list' }, [...unique.values()].map(source => element('li', {}, [sourceLink(source)]))),
  ]);
}

function renderSources(sector, company, contracts, ownership) {
  const sectorSources = [...(sector.sources || []), ...[...sector.metrics, ...sector.topics].flatMap(item => [item.source, ...(item.sources || [])])];
  const companySources = [
    ...(company.sources || []),
    ...(company.financials || []).flatMap(row => [row.source, ...(row.sources || [])]),
    company.valuation?.source,
    ...(company.valuation?.sources || []),
  ];
  const otherSources = [
    ...contracts.flatMap(deal => [deal.source, ...(deal.sources || [])]),
    ...ownership.flatMap(row => [row.source, row.previousSource, row.denominatorSource]),
  ];
  $('energy-sources-content').replaceChildren(element('div', { className: 'topic-grid' }, [
    sourceGroup('Supply and demand', sectorSources),
    sourceGroup(company.name + ' · financial research', companySources),
    sourceGroup(company.name + ' · agreements and ownership', otherSources),
  ]));
}

async function readData(name) {
  const response = await fetch('./data/' + name + '.json');
  if (!response.ok) throw new Error('Unable to load ' + name + ': HTTP ' + response.status);
  return response.json();
}

async function init() {
  try {
    const [{ companies, sector, asOf, methodology }, contracts, ownershipData] = await Promise.all([
      readData('sector'), readData('contracts'), readData('ownership'),
    ]);
    const holders = ownershipData.companies || ownershipData.holdings || ownershipData;
    const ownershipNotes = ownershipData.notes || ownershipData.methodology;
    const select = $('energy-company-select');
    select.replaceChildren(...Object.entries(companies).map(([ticker, company]) =>
      element('option', { value: ticker, text: ticker + ' · ' + company.name })));
    select.disabled = false;

    function renderCompany(ticker) {
      const company = companies[ticker];
      const companyContracts = contracts[ticker] || [];
      const companyHolders = holders[ticker] || [];
      const rows = Array.isArray(companyHolders) ? companyHolders : companyHolders.holders || [];
      select.value = ticker;
      renderBusiness(company);
      renderFinancials(company);
      renderValuation(company.valuation);
      renderContracts(companyContracts);
      renderOwnership(rows, companyHolders.notes || ownershipNotes);
      renderRisks(company);
      renderSources(sector, company, companyContracts, rows);
    }

    function changeCompany(ticker) {
      const url = new URL(location.href);
      url.searchParams.set('company', ticker);
      history.replaceState(null, '', url);
      renderCompany(ticker);
    }

    const first = Object.keys(companies)[0];
    const requested = new URLSearchParams(location.search).get('company')?.toUpperCase();
    renderSector(sector);
    if (asOf) $('energy-sector-heading').after(note('Research snapshot · ' + asOf));
    if (methodology) $('energy-financials-heading').parentElement.after(note(methodology));
    renderCompany(Object.hasOwn(companies, requested) ? requested : first);
    renderComparison(companies, changeCompany);
    renderDealDatabase(contracts, '');
    select.addEventListener('change', () => changeCompany(select.value));
    $('energy-metric-select').addEventListener('change', () => renderFinancials(companies[select.value]));
    $('energy-deal-filter').addEventListener('input', event => renderDealDatabase(contracts, event.target.value));
    $('energy-status').textContent = '';
  } catch (error) {
    $('energy-status').textContent = 'The energy research data could not load. Reload the page to try again.';
    console.error(error);
  }
}

init();
