from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import Duplicate, NotFound
from repositories.sectors import (
    create_sector as create_sector_repo,
)
from repositories.sectors import (
    delete_sector as delete_sector_repo,
)
from repositories.sectors import (
    edit_sector as edit_sector_repo,
)
from repositories.sectors import (
    get_all_sectors as get_all_sectors_repo,
)
from api.schemas.sector import Sector as SectorSchema

router = APIRouter(tags=["Sectors"])


@router.get("/sectors", status_code=HTTPStatus.OK, response_model=list[SectorSchema])
async def read_sectors(
    session: Annotated[AsyncSession, Depends(get_db)]
):
    return await get_all_sectors_repo(session)


@router.post("/sectors", status_code=HTTPStatus.CREATED, response_model=SectorSchema)
async def create_sector(
    sector: SectorSchema, session: Annotated[AsyncSession, Depends(get_db)]
):
    try:
        new_sector = await create_sector_repo(session, sector)

        return new_sector

    except Duplicate as e:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail=str(e),
        )


@router.patch("/sectors/{sector_id}", status_code=HTTPStatus.OK, response_model=SectorSchema)
async def update_sector(
    sector_id: int, updated_data: SectorSchema, session: Annotated[AsyncSession, Depends(get_db)]
):
    try:
        updated_sector = await edit_sector_repo(session, sector_id, updated_data)

        return updated_sector

    except NotFound as e:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(e),
        )

    except Duplicate as e:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail=str(e),
        )


@router.delete("/sectors/{sector_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_sector(
    sector_id: int, session: Annotated[AsyncSession, Depends(get_db)]
):
    try:
        await delete_sector_repo(session, sector_id)

    except NotFound as e:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(e),
        )
