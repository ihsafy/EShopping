import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiRefreshCw, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import { fetchAdminDashboard, fetchRevenueSeries, fetchOrderAnalytics, fetchProductAnalytics } from '../../services/admin';
import { formatPrice, formatDate } from '../../utils/format';

const count = (value) => Number(value || 0).toLocaleString('en-US');

const PERIODS = [
  { key: 'week', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '6m', label: '6 months' },
];

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'];

const moneyTick = (value) => `৳${Number(value).toLocaleString('en-US')}`;

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-chart__tip">
      {label !== undefined && <strong>{label}</strong>}
      {payload.map((entry) => (
        <span key={entry.dataKey || entry.name} style={{ color: entry.color || entry.fill }}>
          {entry.name}: {typeof entry.value === 'number' && entry.dataKey === 'revenue' ? formatPrice(entry.value) : count(entry.value)}
        </span>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('week');
  const [revenue, setRevenue] = useState(null);
  const [orders, setOrders] = useState(null);
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, revenueSeries, orderAnalytics, productAnalytics] = await Promise.all([
        fetchAdminDashboard(),
        fetchRevenueSeries(period),
        fetchOrderAnalytics(),
        fetchProductAnalytics(),
      ]);
      setData(dashboard);
      setRevenue(revenueSeries);
      setOrders(orderAnalytics);
      setProducts(productAnalytics);
    } catch (err) {
      setError(err.status === 401 ? 'Your session has expired. Please sign in again.' : err.message || 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis || {};
  const latestOrders = data?.latestOrders || [];
  const lowStock = data?.lowStockProducts || [];

  const revenueData = (revenue?.series || []).map((row) => ({
    period: row.period,
    revenue: Number(row.revenue),
    orders: Number(row.orders),
  }));
  const statusData = (orders?.byStatus || [])
    .map((row) => ({ name: row.status, value: Number(row.total) }))
    .filter((row) => row.value > 0);
  const categoryData = (products?.byCategory || [])
    .map((row) => ({ name: row.category, value: Number(row.revenue), units: Number(row.units) }))
    .filter((row) => row.value > 0);
  const topProducts = products?.topProducts || [];

  const noSalesData = revenueData.length === 0 && Number(kpis.totalOrders) === 0;

  return (
    <section className="admin-page">
      <Helmet>
        <title>Dashboard | EShopping Admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Store performance at a glance.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
          <FiRefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="alert alert--error">
          {error}{' '}
          <button type="button" className="admin-linkbtn" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {loading && !data && <p className="muted admin-page__loading">Loading the dashboard…</p>}

      {data && (
        <>
          <div className="admin-kpis">
            <article className="admin-kpi">
              <span>Revenue</span>
              <strong>{formatPrice(kpis.totalRevenue)}</strong>
              <em>{formatPrice(kpis.monthRevenue)} this month</em>
            </article>
            <article className="admin-kpi">
              <span>Total orders</span>
              <strong>{count(kpis.totalOrders)}</strong>
              <em>{count(kpis.pendingOrders)} awaiting confirmation</em>
            </article>
            <article className="admin-kpi">
              <span>Total customers</span>
              <strong>{count(kpis.totalCustomers)}</strong>
              <em>{count(kpis.deliveredOrders)} delivered</em>
            </article>
            <article className={`admin-kpi ${Number(kpis.outOfStockProducts) > 0 ? 'admin-kpi--alert' : ''}`}>
              <span>Total products</span>
              <strong>{count(kpis.totalProducts)}</strong>
              <em>
                {count(kpis.activeProducts)} active · {count(kpis.outOfStockProducts)} out of stock
              </em>
            </article>
          </div>

          {noSalesData ? (
            <div className="admin-panel admin-empty">
              <h2>No sales data available yet.</h2>
              <p className="muted">Charts will appear as soon as your first order is placed.</p>
            </div>
          ) : (
            <>
              <div className="admin-charts">
                <section className="admin-panel">
                  <div className="admin-panel__head">
                    <h2>
                      <FiTrendingUp size={16} /> Sales
                    </h2>
                    <div className="admin-segbtn">
                      {PERIODS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={period === option.key ? 'is-active' : ''}
                          onClick={() => setPeriod(option.key)}
                          disabled={loading}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="admin-chart">
                    {revenueData.length === 0 ? (
                      <p className="muted admin-chart__empty">No sales in this period yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.08)" vertical={false} />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="url(#revenueFill)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>

                <section className="admin-panel">
                  <div className="admin-panel__head">
                    <h2>Orders by status</h2>
                  </div>
                  <div className="admin-chart">
                    {statusData.length === 0 ? (
                      <p className="muted admin-chart__empty">No orders yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {statusData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={STATUS_COLORS[entry.name] || CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <ul className="admin-legend">
                    {statusData.map((entry, index) => (
                      <li key={entry.name}>
                        <span
                          style={{
                            background: STATUS_COLORS[entry.name] || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                          }}
                        />
                        {entry.name} <strong>{count(entry.value)}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="admin-charts">
                <section className="admin-panel">
                  <div className="admin-panel__head">
                    <h2>Sales by category</h2>
                  </div>
                  <div className="admin-chart">
                    {categoryData.length === 0 ? (
                      <p className="muted admin-chart__empty">No category sales yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.08)" horizontal={false} />
                          <XAxis type="number" tickFormatter={moneyTick} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,.08)' }} />
                          <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]}>
                            {categoryData.map((entry, index) => (
                              <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>

                <section className="admin-panel">
                  <div className="admin-panel__head">
                    <h2>Top products</h2>
                  </div>
                  {topProducts.length === 0 ? (
                    <p className="muted">No product sales yet.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table admin-table--tight">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Units</th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProducts.slice(0, 8).map((row) => (
                            <tr key={`${row.product_id}-${row.product_name}`}>
                              <td>
                                <div className="admin-prod">
                                  <span className="admin-prod__media admin-prod__media--sm">
                                    {row.product_image ? (
                                      <img src={row.product_image} alt={row.product_name} />
                                    ) : (
                                      <span className="admin-prod__noimg">—</span>
                                    )}
                                  </span>
                                  <span className="admin-prod__meta">
                                    <strong>{row.product_name}</strong>
                                  </span>
                                </div>
                              </td>
                              <td>{count(row.units)}</td>
                              <td>{formatPrice(row.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          <div className="admin-grid">
            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2>Latest orders</h2>
                <Link to="/admin/orders">All orders</Link>
              </div>
              {latestOrders.length === 0 ? (
                <p className="muted">No orders yet.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>{order.order_number}</strong></td>
                          <td>{order.customer_name}</td>
                          <td>{formatPrice(order.total)}</td>
                          <td>
                            <span className="admin-pill" data-status={order.order_status}>
                              {order.order_status}
                            </span>
                          </td>
                          <td>{formatDate(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2>Low stock</h2>
                <Link to="/admin/products">Inventory</Link>
              </div>
              {lowStock.length === 0 ? (
                <p className="muted">Everything is comfortably in stock.</p>
              ) : (
                <ul className="admin-list">
                  {lowStock.map((product) => (
                    <li key={product.id}>
                      <span>
                        <FiAlertTriangle size={14} /> {product.name}
                      </span>
                      <strong className={product.stock <= 0 ? 'admin-list__out' : ''}>
                        {product.stock <= 0 ? 'Out of stock' : `${product.stock} left`}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
