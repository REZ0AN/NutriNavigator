import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Products from "./Products";

let mockState;
const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(mockState),
  useDispatch: () => mockDispatch,
}));
jest.mock("react-router-dom", () => ({ useParams: () => ({ keyword: "apple" }) }));
jest.mock("@mui/material/Slider", () => () => <div />);
jest.mock("../Home/ProductCard", () => ({ product }) => <article>{product.name}</article>);
jest.mock("../layouts/Header/MetaData", () => () => null);

const renderResults = (filteredProductsCount, products) => {
  mockState = {
    productsR: {
      loading: false,
      error: null,
      products,
      productsCount: 20,
      filteredProductsCount,
      resultPerPage: 8,
      uniqueCategories: [],
    },
  };
  render(<Products />);
};

test("a short search result shows its count without catalog pagination", () => {
  renderResults(3, [
    { _id: "1", name: "Apple A" },
    { _id: "2", name: "Apple B" },
    { _id: "3", name: "Apple C" },
  ]);

  expect(screen.getByText("3 results")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Product pagination" })).not.toBeInTheDocument();
});

test("pagination appears only when filtered results exceed the page size", () => {
  renderResults(9, [{ _id: "1", name: "Apple A" }]);

  expect(screen.getByRole("navigation", { name: "Product pagination" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
});

test("zero results do not fall back to the full catalog count", () => {
  renderResults(0, []);

  expect(screen.getByText("0 results")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Product pagination" })).not.toBeInTheDocument();
});
