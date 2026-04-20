from pydantic import BaseModel


class Sector(BaseModel):
    id: int
    sector: str
