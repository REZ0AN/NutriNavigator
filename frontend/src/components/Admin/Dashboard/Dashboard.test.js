import { buildRevenueData, buildRevenueDataFromMetrics, groupOrderValueData, isRangeTooLarge } from "./Dashboard";

test("dashboard rejects ranges longer than one year", () => {
  expect(isRangeTooLarge({ from: "2026-01-01", to: "2027-01-02" })).toBe(true);
  expect(isRangeTooLarge({ from: "2026-01-01", to: "2026-12-31" })).toBe(false);
});

test("dashboard revenue buckets orders in constant-time date lookups", () => {
  const data = buildRevenueData(
    [{ createdAt: "2026-01-01T12:00:00Z", totalprice: 10 }, { createdAt: "2026-01-02T12:00:00Z", totalprice: 20 }],
    { from: "2026-01-01", to: "2026-01-02" },
  );
  expect(data).toEqual([{ label: "Jan 1", revenue: 10 }, { label: "Jan 2", revenue: 20 }]);
});

test("dashboard chart metrics do not depend on paginated page-one orders", () => {
  const metrics = [{ _id: "2026-01-02", totalAmount: 900 }];
  expect(buildRevenueDataFromMetrics(metrics, { from: "2026-01-01", to: "2026-01-02" })).toEqual([
    { label: "Jan 1", revenue: 0 },
    { label: "Jan 2", revenue: 900 },
  ]);
});

test("dashboard groups existing daily order values by UTC week and month", () => {
  const daily = [
    { _id: "2025-12-31", totalAmount: 10 },
    { _id: "2026-01-01", totalAmount: 20 },
    { _id: "2026-01-05", totalAmount: 30 },
  ];
  const range = { from: "2025-12-31", to: "2026-01-05" };

  expect(groupOrderValueData(daily, range, "week")).toEqual([
    { label: "Week of Dec 29", revenue: 30 },
    { label: "Week of Jan 5", revenue: 30 },
  ]);
  expect(groupOrderValueData(daily, range, "month")).toEqual([
    { label: "Dec 2025", revenue: 10 },
    { label: "Jan 2026", revenue: 50 },
  ]);
});
