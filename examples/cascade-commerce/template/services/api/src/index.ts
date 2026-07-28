import { quoteOrder } from "./domain/orderService.js";
import { assessFraud } from "./adapters/fraud.js";
import { track } from "@cascade-demo/observability";

track("api.started");
quoteOrder({ id: "order-1042", items: [] });
assessFraud("order-1042");
