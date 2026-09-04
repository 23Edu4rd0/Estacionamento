from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from api.v1.router import router as v1_router

app = FastAPI()

app.include_router(v1_router, prefix="/api")

BASE_DIR = Path(__file__).resolve().parent
app.mount("/", StaticFiles(directory=str(BASE_DIR / "frontend"), html=True), name="frontend")
