from pydantic import BaseModel
from datetime import date, time


class DesignationBase(BaseModel):
    worker_id: int
    event_date: date
    shift_start: time
    shift_end: time
    sector: str

class DesignationResponse(BaseModel):
    id: int
    event_date: date
    worker_id: int
    shift_start: time
    shift_end: time
    sector: str

