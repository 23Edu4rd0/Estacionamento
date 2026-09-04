from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from api.v1.router import router as v1_router

app = FastAPI()

app.include_router(v1_router, prefix="/api")
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
