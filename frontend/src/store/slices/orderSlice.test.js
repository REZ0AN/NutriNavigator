import axios from "axios";
import { fetchAdminOrderDetails } from "./orderSlice";

jest.mock("axios");

describe("admin order details request", () => {
  test("uses the admin order endpoint", async () => {
    axios.get.mockResolvedValue({ data: { order: { _id: "order-1" } } });
    const dispatch = jest.fn();

    const result = await fetchAdminOrderDetails("order-1")(dispatch, jest.fn(), undefined);

    expect(axios.get).toHaveBeenCalledWith("/api/v1/admin/order/order-1");
    expect(result.payload).toEqual({ _id: "order-1" });
  });
});
