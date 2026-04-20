from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import Duplicate, NotFound
from repositories.workers import (
    create_worker as create_worker_repo,
)
from repositories.workers import (
    delete_worker as delete_worker_repo,
)
from repositories.workers import (
    get_all_workers as get_all_workers_repo,
)
from repositories.workers import (
    update_worker as update_worker_repo,
)
from api.schemas.workers import AllWorkerSchema, WorkerSchema

router = APIRouter(tags=["Workers"])


@router.get("/workers", status_code=HTTPStatus.OK, response_model=list[AllWorkerSchema])
async def get_workers(session: Annotated[AsyncSession, Depends(get_db)]):
    return await get_all_workers_repo(session)


@router.post("/workers", status_code=HTTPStatus.CREATED, response_model=WorkerSchema)
async def create_worker(
    user_data: WorkerSchema, session: Annotated[AsyncSession, Depends(get_db)]
):
    try:
        new_worker = await create_worker_repo(session, user_data)

        return new_worker

    except Duplicate:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="A worker with the same phone number already exists.",
        )


@router.patch(
    "/workers/{worker_id}", status_code=HTTPStatus.OK, response_model=WorkerSchema
)
async def update_worker(
    worker_id: int, worker: WorkerSchema, session: Annotated[AsyncSession, Depends(get_db)]
):
    try:
        updated_worker = await update_worker_repo(
            session=session,
            worker_id=worker_id,
            worker_data=worker,
        )

        return updated_worker

    except NotFound:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Worker not found."
        )
    except Duplicate:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="A worker with the same phone number already exists.",
        )


@router.delete("/workers/{worker_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_worker(worker_id: int, session: Annotated[AsyncSession, Depends(get_db)]):
    try:
        await delete_worker_repo(session=session, worker_id=worker_id)
    except NotFound:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Worker not found."
        )
