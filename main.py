from fastapi import FastAPI

from routers.rooter import router
from routers.workers import router as workers_router
from routers.designations import router as designations_router

app = FastAPI()

app.include_router(router)
app.include_router(workers_router)
app.include_router(designations_router)