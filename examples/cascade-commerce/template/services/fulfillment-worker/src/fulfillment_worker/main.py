from fulfillment_worker.tasks import reserve_inventory


def run() -> None:
    reserve_inventory("order-1042")


if __name__ == "__main__":
    run()
