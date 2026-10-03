import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

let mockState;

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(mockState),
  useDispatch: () => jest.fn(),
}));

jest.mock("./components/DietRecommend/DietRecommend", () => {
  const React = require("react");
  return () => React.createElement("div", null, "Diet recommendation form");
});

describe("diet recommendation route", () => {
  beforeEach(() => {
    sessionStorage.setItem("stripeKey", "pk_test");
    window.history.replaceState({}, "", "/dietrecommend");
    mockState = {
      userR: { loading: false, isAuthenticated: false, user: null },
      cartR: { cartItems: [] },
    };
  });

  afterEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("sends a signed-out visitor to the existing sign-in-required page", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Sign-in required" })).toBeInTheDocument();
    expect(screen.queryByText("Diet recommendation form")).not.toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe("/error/401"));
  });

  it("shows the form to a signed-in user", async () => {
    mockState.userR = {
      loading: false,
      isAuthenticated: true,
      user: { name: "Buyer", email: "buyer@example.com", role: "user" },
    };

    render(<App />);

    expect(await screen.findByText("Diet recommendation form")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dietrecommend");
  });
});
