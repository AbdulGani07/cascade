from fulfillment_worker.warehouse import Warehouse


def reserve_inventory(order_id: str) -> bool:
    return Warehouse().reserve(order_id)
