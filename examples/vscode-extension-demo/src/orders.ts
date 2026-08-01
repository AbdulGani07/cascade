import { formatCurrency } from "./pricing.js";

export function createOrderSummary(id: string, total: number): string {
  return `${id}: ${formatCurrency(total)}`;
}
