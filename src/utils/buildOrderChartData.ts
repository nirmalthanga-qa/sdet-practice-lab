import type { OrderSummary } from '../types/order';

export type OrderChartPoint = {
  date: string;
  label: string;
  orderCount: number;
  totalPaise: number;
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function buildOrderChartData(
  orders: readonly OrderSummary[],
): OrderChartPoint[] {
  const dailyTotals = new Map<string, OrderChartPoint>();

  for (const order of orders) {
    const placedAt = new Date(order.createdAt);

    // Group by the customer's browser timezone, matching the
    // dates displayed on the order history page.
    const year = placedAt.getFullYear();
    const month = String(placedAt.getMonth() + 1).padStart(2, '0');
    const day = String(placedAt.getDate()).padStart(2, '0');

    const date = `${year}-${month}-${day}`;

    const existing = dailyTotals.get(date);

    if (existing) {
      existing.orderCount += 1;
      existing.totalPaise += order.totalPaise;
    } else {
      dailyTotals.set(date, {
        date,
        label: dateFormatter.format(placedAt),
        orderCount: 1,
        totalPaise: order.totalPaise,
      });
    }
  }

  return [...dailyTotals.values()].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
}