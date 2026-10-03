import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AnalyticsToolbar from "./AnalyticsToolbar";

test("analytics toolbar keeps date selection separate from export", () => {
  const onPresetChange = jest.fn();
  const onDateChange = jest.fn();
  const onExport = jest.fn();

  render(
    <AnalyticsToolbar
      preset="sevenDays"
      onPresetChange={onPresetChange}
      range={{ from: "2026-09-27", to: "2026-10-03" }}
      validRange
      rangeTooLarge={false}
      onDateChange={onDateChange}
      onExport={onExport}
      exporting={false}
    />,
  );

  expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "30 days" }));
  expect(onPresetChange).toHaveBeenCalledWith("thirtyDays");
  fireEvent.change(screen.getByLabelText("From date (UTC)"), { target: { value: "2026-09-01" } });
  expect(onDateChange).toHaveBeenCalledWith("from", "2026-09-01");
  fireEvent.click(screen.getByRole("button", { name: "Export delivered" }));
  expect(onExport).toHaveBeenCalledTimes(1);
});
