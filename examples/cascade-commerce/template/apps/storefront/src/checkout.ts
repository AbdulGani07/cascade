import type { Order } from "@cascade-demo/contracts";
import { calculateTotal } from "@cascade-demo/pricing";
import { track } from "@cascade-demo/observability";

export function renderCheckout(id: string): Order {
  const order: Order = { id, items: [{ sku: "tea", quantity: 2, unitPrice: 12 }] };
  track("checkout.rendered");
  calculateTotal(order);
  return order;
}
