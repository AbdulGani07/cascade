import type { Order } from "@cascade-demo/contracts";
import { calculateTotal } from "@cascade-demo/pricing";
import { storefrontFlag } from "../../../../apps/storefront/src/featureFlags.js";

export function quoteOrder(order: Order): number {
  return storefrontFlag("recommendations") ? calculateTotal(order) : 0;
}
