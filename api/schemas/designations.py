from datetime import date, time

from pydantic import BaseModel


class DesignationBase(BaseModel):
    worker_id: int
    event_date: date
    shift_start: time
    shift_end: time
    sector_id: int | None = None


class DesignationResponse(BaseModel):
    id: int
    event_date: date
    worker_id: int
    worker_name: str
    shift_start: time
    shift_end: time
    sector_id: int | None = None
    sector: str | None = None
    confirmed_present: bool
    substituted: bool


class DesignationStatusUpdate(BaseModel):
    confirmed_present: bool | None = None
    substituted: bool | None = None
