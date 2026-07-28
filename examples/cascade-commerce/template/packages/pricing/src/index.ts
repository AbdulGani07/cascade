import type { Order } from "@cascade-demo/contracts";
import { discountFor } from "./discounts.js";

export function calculateTotal(order: Order): number {
  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return subtotal - discountFor(subtotal);
}
