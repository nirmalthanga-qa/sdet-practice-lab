import { useId, useState } from 'react';
import { max, scaleBand, scaleLinear } from 'd3';
import { buildOrderChartData } from '../utils/buildOrderChartData';
import type { OrderSummary } from '../types/order';

type OrderSpendingChartProps = {
  orders: readonly OrderSummary[];
};

type ChartMetric = 'spending' | 'orders';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

const axisFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});

const width = 800;
const height = 360;

const margin = {
  top: 24,
  right: 24,
  bottom: 64,
  left: 110,
};

export default function OrderSpendingChart({
  orders,
}: OrderSpendingChartProps) {
  const id = useId();
  const [metric, setMetric] = useState<ChartMetric>('spending');

  const data = buildOrderChartData(orders);
  const isSpending = metric === 'spending';

  const headingId = `${id}-heading`;
  const selectId = `${id}-metric`;
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  function getValue(point: (typeof data)[number]) {
    return isSpending ? point.totalPaise / 100 : point.orderCount;
  }

  const xScale = scaleBand<string>()
    .domain(data.map((point) => point.date))
    .range([margin.left, width - margin.right])
    .padding(0.25);

  const maximumValue = max(data, getValue) ?? 0;

  const yScale = scaleLinear()
    .domain([0, Math.max(1, maximumValue)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const yTicks = yScale
    .ticks(5)
    .filter((value) => isSpending || Number.isInteger(value));

  const labelInterval = Math.max(1, Math.ceil(data.length / 6));
  const baseline = height - margin.bottom;

  return (
    <section
      className="order-chart"
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>Your purchase activity</h2>

      <p className="field-help">
        Daily totals from your latest 50 orders, grouped using your
        browser’s timezone. Older orders may be excluded. All spending
        is simulated.
      </p>

      {data.length === 0 ? (
        <p>Your chart will appear after your first order.</p>
      ) : (
        <>
          <div className="category-field order-chart-control">
            <label htmlFor={selectId}>Chart metric</label>

            <select
              id={selectId}
              value={metric}
              onChange={(event) => {
                const value = event.target.value;

                if (value === 'spending' || value === 'orders') {
                  setMetric(value);
                }
              }}
            >
              <option value="spending">Amount spent</option>
              <option value="orders">Number of orders</option>
            </select>
          </div>

          <p role="status" aria-atomic="true">
            Showing {isSpending ? 'amount spent' : 'number of orders'}
            {' '}across {data.length}{' '}
            {data.length === 1 ? 'day' : 'days'} with purchases.
          </p>

          <svg
            className="order-chart-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-labelledby={`${titleId} ${descriptionId}`}
          >
            <title id={titleId}>
              {isSpending
                ? 'Daily simulated spending in Indian rupees'
                : 'Daily number of orders'}
            </title>

            <desc id={descriptionId}>
              Bar chart of the loaded orders, oldest day first.
              Only days with purchases are shown.
              Exact values are available in the data table below.
            </desc>

            {yTicks.map((value) => (
              <g key={value}>
                <line
                  className="order-chart-gridline"
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={yScale(value)}
                  y2={yScale(value)}
                />

                <text
                  className="order-chart-label"
                  x={margin.left - 12}
                  y={yScale(value)}
                  dy="0.35em"
                  textAnchor="end"
                >
                  {isSpending
                    ? `₹${axisFormatter.format(value)}`
                    : value}
                </text>
              </g>
            ))}

            <line
              className="order-chart-axis"
              x1={margin.left}
              x2={width - margin.right}
              y1={baseline}
              y2={baseline}
            />

            {data.map((point, index) => {
              const x = xScale(point.date);

              if (x === undefined) {
                return null;
              }

              const value = getValue(point);
              const y = yScale(value);

              const showLabel =
                index % labelInterval === 0;

              return (
                <g key={point.date}>
                  <rect
                    className="order-chart-bar"
                    x={x}
                    y={y}
                    width={xScale.bandwidth()}
                    height={Math.max(0, baseline - y)}
                    rx={2}
                  >
                    <title>
                      {point.label}:{' '}
                      {isSpending
                        ? currencyFormatter.format(value)
                        : `${value} ${
                            value === 1 ? 'order' : 'orders'
                          }`}
                    </title>
                  </rect>

                  {showLabel && (
                    <text
                      className="order-chart-label"
                      x={x + xScale.bandwidth() / 2}
                      y={baseline + 24}
                      textAnchor="middle"
                    >
                      {point.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}

            <text
              className="order-chart-label"
              x={(margin.left + width - margin.right) / 2}
              y={height - 8}
              textAnchor="middle"
            >
              Purchase date (MM-DD)
            </text>
          </svg>

          <details className="order-chart-data">
            <summary>View chart data table</summary>

            <div className="order-chart-table-wrapper">
              <table className="order-chart-table">
                <caption>
                  Daily totals within the loaded orders
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Orders</th>
                    <th scope="col">Simulated spending</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((point) => (
                    <tr key={point.date}>
                      <th scope="row">{point.label}</th>
                      <td>{point.orderCount}</td>
                      <td>
                        {currencyFormatter.format(
                          point.totalPaise / 100,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}