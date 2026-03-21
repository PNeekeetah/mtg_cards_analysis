from dataclasses import dataclass


@dataclass
class CardEntry:
    name: str
    quantity: int
    foil: bool

    def update_quantity(self, qty: int):
        self.quantity += qty
