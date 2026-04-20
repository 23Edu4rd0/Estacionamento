from fastapi import APIRouter

from .endpoints import designations, sectors, workers, rooter

router = APIRouter(prefix="/v1")

router.include_router(rooter.router, prefix="/rooter", tags=["Rooter"])
router.include_router(designations.router, prefix="/designations", tags=["Designations"])
router.include_router(workers.router, prefix="/workers", tags=["Workers"])
router.include_router(sectors.router, prefix="/sectors", tags=["Sectors"])