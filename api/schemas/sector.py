from pydantic import BaseModel


class Sector(BaseModel):
    id: int | None = None
    sector: str
