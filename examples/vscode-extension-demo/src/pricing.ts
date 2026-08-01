import { createOrderSummary } from "./orders.js";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(value);
}

export function previewOrder(): string {
  return createOrderSummary("preview", 42);
}
