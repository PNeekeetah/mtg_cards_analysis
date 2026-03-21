from pydantic import BaseModel
from typing import Dict, Any

class ImageURIs(BaseModel):
    small: str | None = None
    normal: str | None = None
    large: str | None = None
    
    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()