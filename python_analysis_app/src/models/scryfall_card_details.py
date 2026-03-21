from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any

from src.models.prices import Prices
from src.models.image_uris import ImageURIs


class ScryfallCardDetails(BaseModel):
    name: str
    oracle_text: str = ""

    @field_validator("name", mode="before")
    def lower_name(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v

    colors: List[str] = Field(default_factory=list)
    color_identity: List[str]
    keywords: List[str]
    produced_mana: List[str] | None = None
    mana_cost: str = ""
    rarity: str
    prices: Prices | None = None
    image_uris: ImageURIs | None = None
    released_at: str

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
