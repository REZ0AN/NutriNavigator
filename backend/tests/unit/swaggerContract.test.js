import { swaggerSpec } from "../../docs/swagger.js";

describe("OpenAPI payment and order contracts", () => {
  test("documents server-calculated payment input", () => {
    const schema = swaggerSpec.paths["/payment/process"].post.requestBody.content["application/json"].schema;
    expect(schema.$ref).toBe("#/components/schemas/PaymentProcessInput");
    const input = swaggerSpec.components.schemas.PaymentProcessInput;
    expect(input.required).toEqual(["orderitems", "shippinginfo"]);
    expect(input.properties.idempotencyKey.maxLength).toBe(255);
    expect(input.properties.amount).toBeUndefined();
  });

  test("documents only client-owned order input fields as required", () => {
    const operation = swaggerSpec.paths["/order/new"].post;
    const schema = operation.requestBody.content["application/json"].schema;
    expect(schema.required).toEqual(["shippinginfo", "orderitems", "paymentinfo"]);
    expect(schema.properties.paymentinfo.required).toEqual(["id"]);
    expect(schema.properties.itemsprice).toBeUndefined();
    expect(schema.properties.totalprice).toBeUndefined();
    expect(swaggerSpec.components.schemas.Order.properties.totalprice.readOnly).toBe(true);
  });
});
