from pydantic import BaseModel

class WorkerSchema(BaseModel):
    name: str
    phone_number: str
    congregation: str

class AllWorkerSchema(WorkerSchema):
    id: int