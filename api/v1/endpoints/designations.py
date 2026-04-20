from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import Duplicate, NotFound
from repositories.designations import create_designation_repo, get_all_designations
from api.schemas.designations import DesignationBase, DesignationResponse

router = APIRouter(tags=["Designations"])


@router.get(
    "/designations", status_code=HTTPStatus.OK, response_model=list[DesignationResponse]
)
async def get_designations(session: Annotated[AsyncSession, Depends(get_db)]):
    try:
        return await get_all_designations(session)

    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/designations/{designation_date}",
    status_code=HTTPStatus.OK,
    response_model=DesignationResponse,
)
async def get_designations_by_date(
    designation_date: str, session: Annotated[AsyncSession, Depends(get_db)]
):
    return {"message": f"In development / test {designation_date}"}


@router.post(
    "/designations", status_code=HTTPStatus.CREATED, response_model=DesignationBase
)
async def create_designation(
    designation: DesignationBase, session: Annotated[AsyncSession, Depends(get_db)]
):
    try:
        return await create_designation_repo(session, designation)

    except NotFound:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Worker not found."
        )
    except Duplicate:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="This worker is already designated for the specified shift and date.",
        )
