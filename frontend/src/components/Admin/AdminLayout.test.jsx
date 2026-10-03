import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import AdminLayout from "./AdminLayout";

test("admin mobile menu opens and closes after navigation", () => {
  render(
    <MemoryRouter>
      <AdminLayout><h1>Dashboard content</h1></AdminLayout>
    </MemoryRouter>,
  );

  const openButton = screen.getByRole("button", { name: "Open admin menu" });
  fireEvent.click(openButton);
  expect(screen.getByRole("button", { name: "Close admin menu", expanded: true })).toBeInTheDocument();
  expect(document.getElementById("admin-navigation")).toHaveClass("admin-sidebar--open");

  fireEvent.click(screen.getByRole("link", { name: "Orders" }));
  expect(document.getElementById("admin-navigation")).not.toHaveClass("admin-sidebar--open");
  expect(screen.getByRole("heading", { name: "Dashboard content" })).toBeInTheDocument();
});
