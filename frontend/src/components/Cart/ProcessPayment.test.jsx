import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ProcessPayment from "./ProcessPayment";
import axios from "axios";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockConfirmCardPayment = jest.fn();
const mockCreateOrder = jest.fn();
let mockCartItems = [{ product: "p1", quantity: 2, price: 0.01 }];

jest.mock("axios");
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector({
    cartR: { shippingInfo: { address: "1 Main", city: "Dhaka", pinCode: 1207, country: "BD" }, cartItems: mockCartItems },
    userR: { user: { name: "Test User", email: "test@example.com" } },
    newOrderR: { error: null },
  }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("@stripe/react-stripe-js", () => ({
  CardNumberElement: () => <div data-testid="card-number" />,
  CardExpiryElement: () => <div />,
  CardCvcElement: () => <div />,
  useStripe: () => ({ confirmCardPayment: mockConfirmCardPayment }),
  useElements: () => ({ getElement: jest.fn(() => ({})) }),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("../../store/slices/orderSlice", () => ({
  createOrder: (...args) => mockCreateOrder(...args),
  clearNewOrderError: () => ({ type: "orders/clearError" }),
}));
jest.mock("../../store/slices/cartSlice", () => ({ clearCart: () => ({ type: "cart/clear" }) }));
jest.mock("../layouts/Header/MetaData", () => () => null);
jest.mock("./CheckoutSteps", () => () => null);

describe("ProcessPayment checkout sequencing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCartItems = [{ product: "p1", quantity: 2, price: 0.01 }];
    sessionStorage.clear();
    global.crypto = { randomUUID: jest.fn()
      .mockReturnValueOnce("attempt-123")
      .mockReturnValueOnce("attempt-456")
      .mockReturnValue("attempt-next") };
    axios.post.mockResolvedValue({ data: { client_secret: "secret", pricing: { totalprice: 436 } } });
    mockConfirmCardPayment.mockResolvedValue({ paymentIntent: { id: "pi_123", status: "succeeded" } });
  });

  const renderPayment = (orderResult) => {
    mockCreateOrder.mockReturnValue({ unwrap: orderResult === "failure" ? async () => { throw new Error("database unavailable"); } : () => Promise.resolve(orderResult) });
    mockDispatch.mockImplementation((action) => action?.unwrap ? action : undefined);
    sessionStorage.setItem("orderInfo", JSON.stringify({ totalPrice: 436 }));
    return render(<ProcessPayment />);
  };

  test("sends an idempotency key and preserves the cart when order persistence fails", async () => {
    renderPayment("failure");
    await userEvent.click(screen.getByRole("button", { name: /pay/i }));
    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith("/api/v1/payment/process", expect.objectContaining({
      idempotencyKey: "attempt-123",
      shippinginfo: expect.objectContaining({ address: "1 Main", city: "Dhaka" }),
    }));
    expect(mockDispatch).not.toHaveBeenCalledWith({ type: "cart/clear" });
    expect(mockNavigate).not.toHaveBeenCalledWith("/success");
    expect(sessionStorage.getItem("paymentAttemptId")).toBe("attempt-123");
  });

  test("rotates the key after Stripe confirmation fails, then uses the new key", async () => {
    mockConfirmCardPayment.mockResolvedValueOnce({ error: { message: "Card declined" } });
    renderPayment("failure");
    await userEvent.click(screen.getByRole("button", { name: /pay/i }));
    await waitFor(() => expect(sessionStorage.getItem("paymentAttemptId")).toBe("attempt-456"));

    mockConfirmCardPayment.mockResolvedValueOnce({ paymentIntent: { id: "pi_456", status: "succeeded" } });
    mockCreateOrder.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
    await userEvent.click(screen.getByRole("button", { name: /pay/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/success"));
    expect(axios.post).toHaveBeenLastCalledWith("/api/v1/payment/process", expect.objectContaining({ idempotencyKey: "attempt-456" }));
  });

  test("rotates the key when payment processing fails", async () => {
    axios.post.mockRejectedValueOnce(new Error("payment service unavailable"));
    renderPayment("failure");
    await userEvent.click(screen.getByRole("button", { name: /pay/i }));
    await waitFor(() => expect(sessionStorage.getItem("paymentAttemptId")).toBe("attempt-456"));
    expect(mockConfirmCardPayment).not.toHaveBeenCalled();
  });

  test("rotates the key when the cart fingerprint changes", async () => {
    const { rerender } = renderPayment("failure");
    expect(sessionStorage.getItem("paymentAttemptId")).toBe("attempt-123");
    mockCartItems = [{ product: "p2", quantity: 1, price: 50 }];
    rerender(<ProcessPayment />);
    await waitFor(() => expect(sessionStorage.getItem("paymentAttemptId")).toBe("attempt-456"));
  });

  test("clears cart and redirects only after order persistence succeeds", async () => {
    renderPayment(Promise.resolve({ success: true }));
    await userEvent.click(screen.getByRole("button", { name: /pay/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/success"));
    expect(mockDispatch.mock.calls.filter(([action]) => action?.type === "cart/clear")).toHaveLength(1);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "cart/clear" });
    expect(sessionStorage.getItem("paymentAttemptId")).toBeNull();
  });
});
