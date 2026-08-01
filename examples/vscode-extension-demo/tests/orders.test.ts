import { createOrderSummary } from "../src/orders.js";

export function verifiesOrderSummary(): boolean {
  return createOrderSummary("sample", 19) === "sample: $19.00";
}
