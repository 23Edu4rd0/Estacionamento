from datetime import date
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import Duplicate, NotFound
from core.security import require_current_user
from repositories.designations import (
    create_designation_repo,
    get_all_designations,
    update_designation_status,
)
from api.schemas.designations import (
    DesignationBase,
    DesignationResponse,
    DesignationStatusUpdate,
)

router = APIRouter(tags=["Designations"])


@router.get(
    "/designations", status_code=HTTPStatus.OK, response_model=list[DesignationResponse]
)
async def get_designations(
    session: Annotated[AsyncSession, Depends(get_db)],
    event_date: date | None = None,
):
    try:
        return await get_all_designations(session, event_date)

    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/designations",
    status_code=HTTPStatus.CREATED,
    response_model=DesignationResponse,
    dependencies=[Depends(require_current_user)],
)
async def create_designation(
    designation: DesignationBase, session: Annotated[AsyncSession, Depends(get_db)]
):
    try:
        return await create_designation_repo(session, designation)

    except NotFound:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Worker or sector not found."
        )
    except Duplicate:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="This worker is already designated for the specified shift and date.",
        )


@router.patch(
    "/designations/{designation_id}/status",
    status_code=HTTPStatus.OK,
    response_model=DesignationResponse,
    dependencies=[Depends(require_current_user)],
)
async def set_designation_status(
    designation_id: int,
    status_update: DesignationStatusUpdate,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        return await update_designation_status(session, designation_id, status_update)

    except NotFound:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Designation not found."
        )
