import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiAlertTriangle,
  FiBox,
  FiDollarSign,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import {
  fetchAdminDashboard,
  fetchRevenueSeries,
  fetchProductAnalytics,
} from '../../services/admin';
import { formatPrice, formatDate } from '../../utils/format';
import StatusPill from '../../components/ui/StatusPill';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import CountUp from '../../components/ui/CountUp';
import { Skeleton, SkeletonText, SkeletonTable } from '../../components/ui/Skeleton';

const count = (value) => Number(value || 0).toLocaleString('en-US');

const PERIODS = [
  { key: 'week', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '6m', label: '6 months' },
  { key: 'all', label: 'All time' },
];

/**
 * Donut colours are read from the same CSS variables the status pills use, so
 * the chart, the legend and the order tables can never disagree on a colour.
 * Values are resolved once per theme change via getComputedStyle.
 */
const STATUS_VAR = {
  pending: '--st-pending',
  confirmed: '--st-confirmed',
  processing: '--st-processing',
  shipped: '--st-shipped',
  delivered: '--st-delivered',
  cancelled: '--st-cancelled',
};

function useChartTokens() {
  const [tokens, setTokens] = useState(() => readTokens());

  useEffect(() => {
    const observer = new MutationObserver(() => setTokens(readTokens()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return tokens;
}

function readTokens() {
  if (typeof window === 'undefined') {
    return { status: {}, grid: '#e7e7ec', axis: '#767d8c', track: '#ececf1', accent: '#4a49d4' };
  }
  const style = getComputedStyle(document.documentElement);
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    status: Object.fromEntries(
      Object.entries(STATUS_VAR).map(([key, variable]) => [key, read(variable, '#767d8c')])
    ),
    grid: read('--chart-grid', 'rgba(13,15,20,.07)'),
    axis: read('--chart-axis', '#767d8c'),
    track: read('--chart-track', '#ececf1'),
    accent: read('--chart-1', '#4a49d4'),
  };
}

function compactTick(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `৳${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `৳${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `৳${n}`;
}

function ChartTooltip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-chart__tip">
      {label !== undefined && label !== '' && <b>{label}</b>}
      {payload.map((entry) => (
        <span key={entry.dataKey || entry.name} style={{ color: entry.payload?.fill || entry.color }}>
          {entry.name}: {money ? formatPrice(entry.value) : count(entry.value)}
        </span>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint, moneyValue = false, tone }) {
  return (
    <article className={`admin-kpi ${tone ? `admin-kpi--${tone}` : ''}`.trim()}>
      <div className="admin-kpi__top">
        <span>{label}</span>
        <span className="admin-kpi__icon" aria-hidden="true">
          <Icon />
        </span>
      </div>
      <strong>
        {moneyValue ? `৳${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <CountUp value={value} />}
      </strong>
      {hint ? <em>{hint}</em> : null}
    </article>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('week');
  const [revenue, setRevenue] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [topProducts, setTopProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState(null);
  const tokens = useChartTokens();
  const bootedRef = useRef(false);

  // Core payload: KPIs, status breakdown, latest orders, inventory.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, products] = await Promise.all([
        fetchAdminDashboard(),
        fetchProductAnalytics().catch(() => null),
      ]);
      setData(dashboard);
      setTopProducts(products?.topProducts || []);
    } catch (err) {
      setError(
        err.status === 401
          ? 'Your session has expired. Please sign in again.'
          : err.message || 'Could not load the dashboard.'
      );
    } finally {
      setLoading(false);
      bootedRef.current = true;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Revenue series reloads on its own when the range changes - the KPI request
  // above is never repeated just to change the chart window.
  useEffect(() => {
    let alive = true;
    setRevenueLoading(true);
    fetchRevenueSeries(period)
      .then((result) => {
        if (alive) setRevenue(result);
      })
      .catch(() => {
        if (alive) setRevenue({ series: [] });
      })
      .finally(() => {
        if (alive) setRevenueLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period]);

  const kpis = data?.kpis || {};

  const statusItems = useMemo(() => {
    const items = data?.ordersByStatus?.items || [];
    return items.map((row) => ({ ...row, total: Number(row.total) || 0, share: Number(row.share) || 0 }));
  }, [data]);

  const statusTotal = useMemo(
    () => statusItems.reduce((sum, row) => sum + row.total, 0),
    [statusItems]
  );

  const revenueData = useMemo(
    () =>
      (revenue?.series || []).map((row) => ({
        period: row.period,
        revenue: Number(row.revenue) || 0,
        orders: Number(row.orders) || 0,
      })),
    [revenue]
  );

  const latestOrders = data?.latestOrders || [];
  const lowStock = data?.lowStockProducts || [];
  const outOfStock = data?.outOfStockProducts || [];
  const hasOrders = Number(kpis.totalOrders) > 0;
  const hasRevenueInPeriod = revenueData.some((row) => row.revenue > 0);

  return (
    <section className="admin-page">
      <Helmet>
        <title>Dashboard | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Dashboard</h1>
          <p>Store performance at a glance.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={load}
          disabled={loading}
          aria-busy={loading}
        >
          <FiRefreshCw size={14} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <ErrorState title="Dashboard unavailable" text={error} onRetry={load} retrying={loading} />
        </div>
      )}

      {loading && !data && !error && (
        <>
          <div className="admin-kpis">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="admin-kpi" key={i} aria-hidden="true">
                <Skeleton className="skeleton-text" width="52%" />
                <Skeleton height={26} width="70%" />
              </div>
            ))}
          </div>
          <div className="admin-charts">
            <div className="admin-panel">
              <div className="admin-panel__head">
                <Skeleton className="skeleton-title" width={120} />
              </div>
              <div className="admin-panel__body">
                <Skeleton height={240} radius="var(--r-md)" />
              </div>
            </div>
            <div className="admin-panel">
              <div className="admin-panel__head">
                <Skeleton className="skeleton-title" width={140} />
              </div>
              <div className="admin-panel__body">
                <Skeleton height={240} radius="var(--r-md)" />
              </div>
            </div>
          </div>
          <div className="admin-panel">
            <SkeletonTable rows={5} columns={5} />
          </div>
        </>
      )}

      {data && !error && (
        <>
          <div className="admin-kpis">
            <MetricCard
              icon={FiDollarSign}
              label="Revenue"
              value={kpis.totalRevenue}
              moneyValue
              hint={`${formatPrice(kpis.monthRevenue)} this month · ${formatPrice(kpis.todayRevenue)} today`}
            />
            <MetricCard
              icon={FiShoppingBag}
              label="Total orders"
              value={kpis.totalOrders}
              hint={`${count(kpis.pendingOrders)} pending · ${count(kpis.deliveredOrders)} delivered`}
            />
            <MetricCard
              icon={FiUsers}
              label="Customers"
              value={kpis.totalCustomers}
              hint="Registered accounts"
            />
            <MetricCard
              icon={FiBox}
              label="Products"
              value={kpis.totalProducts}
              hint={`${count(kpis.activeProducts)} active · ${count(kpis.lowStockProducts)} low stock`}
              tone={Number(kpis.outOfStockProducts) > 0 ? 'danger' : undefined}
            />
          </div>

          <div className="admin-charts">
            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2>
                  <FiTrendingUp size={16} aria-hidden="true" /> Sales
                </h2>
                <div className="admin-segbtn" role="group" aria-label="Sales period">
                  {PERIODS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={period === option.key ? 'is-active' : ''}
                      aria-pressed={period === option.key}
                      onClick={() => setPeriod(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="admin-panel__body">
                <div className="admin-chart">
                  {revenueLoading && !revenue ? (
                    <Skeleton height="100%" radius="var(--r-md)" />
                  ) : revenueData.length === 0 ? (
                    <div className="admin-chart__empty">
                      <EmptyState
                        compact
                        title="No orders in this range"
                        text="Pick a wider range above, or check back once orders start coming in."
                      />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={tokens.accent} stopOpacity={0.34} />
                            <stop offset="100%" stopColor={tokens.accent} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={tokens.grid} vertical={false} />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 11, fill: tokens.axis }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={16}
                        />
                        <YAxis
                          tickFormatter={compactTick}
                          tick={{ fontSize: 11, fill: tokens.axis }}
                          tickLine={false}
                          axisLine={false}
                          width={58}
                        />
                        <Tooltip content={<ChartTooltip money />} cursor={{ stroke: tokens.grid }} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke={tokens.accent}
                          strokeWidth={2}
                          fill="url(#revenueFill)"
                          activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {revenueData.length > 0 && !hasRevenueInPeriod && (
                  <p className="t-xs t-muted" style={{ marginTop: 'var(--sp-2)' }}>
                    No revenue was recorded in this range, but the period is shown so you can confirm
                    nothing is hidden.
                  </p>
                )}
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2>Orders by status</h2>
                <span className="badge badge-neutral">{count(statusTotal)} total</span>
              </div>
              <div className="admin-panel__body">
                {statusTotal === 0 ? (
                  <div className="admin-chart admin-chart--short">
                    <div className="admin-chart__empty">
                      <EmptyState
                        compact
                        title="No orders yet"
                        text="Every status will appear here, including the ones sitting at zero, as soon as the first order lands."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="admin-donut">
                    <div className="admin-donut__chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusItems}
                            dataKey="total"
                            nameKey="label"
                            innerRadius="58%"
                            outerRadius="92%"
                            paddingAngle={2}
                            stroke="none"
                            onMouseEnter={(_, index) => setActiveStatus(statusItems[index]?.status || null)}
                            onMouseLeave={() => setActiveStatus(null)}
                          >
                            {statusItems.map((entry) => (
                              <Cell
                                key={entry.status}
                                fill={tokens.status[entry.status] || tokens.accent}
                                opacity={activeStatus && activeStatus !== entry.status ? 0.32 : 1}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <text
                            x="50%"
                            y="46%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fill: 'var(--c-text)', fontSize: 24, fontWeight: 600 }}
                          >
                            {count(statusTotal)}
                          </text>
                          <text
                            x="50%"
                            y="60%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fill: 'var(--c-text-3)', fontSize: 11 }}
                          >
                            orders
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <ul className="admin-legend">
                      {statusItems.map((entry) => (
                        <li
                          key={entry.status}
                          className={
                            activeStatus === entry.status
                              ? 'is-active'
                              : activeStatus
                                ? 'is-dim'
                                : ''
                          }
                          onMouseEnter={() => setActiveStatus(entry.status)}
                          onMouseLeave={() => setActiveStatus(null)}
                        >
                          <span>
                            <i
                              style={{
                                background: tokens.status[entry.status] || tokens.accent,
                                width: 9,
                                height: 9,
                              }}
                              aria-hidden="true"
                            />
                            {entry.label}
                          </span>
                          <em>
                            {entry.share}% · <strong>{count(entry.total)}</strong>
                          </em>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="admin-panel" style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="admin-panel__head">
              <h2>Top products</h2>
              <Link to="/admin/products">Manage products</Link>
            </div>
            {topProducts === null ? (
              <div className="admin-panel__body">
                <SkeletonText lines={3} />
              </div>
            ) : topProducts.length === 0 ? (
              <EmptyState
                compact
                title="No product sales yet"
                text="Units sold and revenue by product will appear here once orders are fulfilled."
              />
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--tight">
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col" className="admin-table__num">Units</th>
                      <th scope="col" className="admin-table__num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.slice(0, 8).map((row) => (
                      <tr key={`${row.product_id}-${row.product_name}`}>
                        <td>
                          <div className="admin-prod">
                            <span className="admin-prod__media admin-prod__media--sm">
                              {row.product_image ? (
                                <img src={row.product_image} alt="" loading="lazy" />
                              ) : (
                                <FiBox aria-hidden="true" />
                              )}
                            </span>
                            <span className="admin-prod__meta">
                              <strong>{row.product_name}</strong>
                            </span>
                          </div>
                        </td>
                        <td className="admin-table__num">{count(row.units)}</td>
                        <td className="admin-table__num">{formatPrice(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="admin-grid">
            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2>Latest orders</h2>
                <Link to="/admin/orders">All orders</Link>
              </div>
              {latestOrders.length === 0 ? (
                <EmptyState
                  compact
                  title="No orders yet"
                  text="New orders will show up here the moment a customer checks out."
                  action={<Link className="btn btn-outline btn-sm" to="/admin/orders">Open orders</Link>}
                />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col">Order</th>
                        <th scope="col">Customer</th>
                        <th scope="col" className="admin-table__num">Total</th>
                        <th scope="col">Status</th>
                        <th scope="col">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <Link to={`/admin/orders`} className="t-mono">
                              {order.order_number}
                            </Link>
                          </td>
                          <td>{order.customer_name}</td>
                          <td className="admin-table__num">{formatPrice(order.total)}</td>
                          <td>
                            <StatusPill status={order.order_status} />
                          </td>
                          <td className="t-nowrap">{formatDate(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {hasOrders && latestOrders.length > 0 && (
                <div className="admin-panel__foot">
                  <span className="t-xs t-muted">
                    Showing the {latestOrders.length} most recent of {count(kpis.totalOrders)} orders.
                  </span>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2>Inventory alerts</h2>
                <Link to="/admin/products">Inventory</Link>
              </div>
              <div className="admin-panel__body">
                {lowStock.length === 0 && outOfStock.length === 0 ? (
                  <EmptyState
                    compact
                    title="Everything is in stock"
                    text="No products are low on stock and none are out of stock right now."
                  />
                ) : (
                  <ul className="admin-list">
                    {outOfStock.slice(0, 5).map((product) => (
                      <li key={`out-${product.id}`}>
                        <span>
                          <FiAlertTriangle aria-hidden="true" /> {product.name}
                        </span>
                        <strong className="admin-list__out t-danger">Out of stock</strong>
                      </li>
                    ))}
                    {lowStock
                      .filter((product) => product.stock > 0)
                      .slice(0, 8)
                      .map((product) => (
                        <li key={`low-${product.id}`}>
                          <span>
                            <FiAlertTriangle aria-hidden="true" /> {product.name}
                          </span>
                          <strong className="admin-list__out">{product.stock} left</strong>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}