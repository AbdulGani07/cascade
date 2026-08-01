import { createOrderSummary } from "./orders.js";

export function renderCheckout(total: number): string {
  return createOrderSummary("demo-order", total);
}
