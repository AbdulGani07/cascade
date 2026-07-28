import { calculateTotal } from "./index.js";

export function pricingContractTest(): boolean {
  return (
    calculateTotal({
      id: "test-order",
      items: [{ sku: "coffee", quantity: 1, unitPrice: 20 }],
    }) === 18
  );
}
