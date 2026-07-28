from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .types import Shape
import importlib
worker = importlib.import_module("worker")
import missing_module
