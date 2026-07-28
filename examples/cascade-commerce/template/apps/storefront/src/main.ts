import { renderCheckout } from "./checkout.js";
import { track } from "@cascade-demo/observability";

track("storefront.started");
renderCheckout("order-1042");
