
from pydantic import BaseModel
from typing import Dict

class Prices(BaseModel):
    usd: float | None = None
    usd_foil: float | None = None
    usd_etched: float | None = None
    eur: float | None = None
    eur_foil: float | None = None
    tix: float | None = None
    
    def to_dict(self) -> Dict[str, float | None]:
        return self.model_dump()
