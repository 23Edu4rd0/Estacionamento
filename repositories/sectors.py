from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import Duplicate, NotFound
from models.sectors import Sector as SectorModel


async def get_all_sectors(session: AsyncSession):
    result = await session.scalars(select(SectorModel))
    return result.all()


async def create_sector(session: AsyncSession, sector):

    verify_duplicate = await session.scalar(
        select(SectorModel).where(SectorModel.sector == sector.sector)
    )

    if verify_duplicate:
        raise Duplicate(f"Sector with name {sector.sector} already exists.")

    new_sector = SectorModel(sector=sector.sector)

    session.add(new_sector)
    await session.commit()
    await session.refresh(new_sector)

    return new_sector


async def edit_sector(session: AsyncSession, sector_id: int, updated_data):
    sector = await session.get(SectorModel, sector_id)

    if not sector:
        raise NotFound(f"Sector with id {sector_id} not found.")

    if updated_data.sector:
        verify_duplicate = await session.scalar(
            select(SectorModel).where(
                SectorModel.sector == updated_data.sector, SectorModel.id != sector_id
            )
        )

        if verify_duplicate:
            raise Duplicate(f"Sector with name {updated_data.sector} already exists.")

    for key, value in updated_data.dict(exclude_unset=True).items():
        setattr(sector, key, value)

    await session.commit()
    await session.refresh(sector)

    return sector


async def delete_sector(session: AsyncSession, sector_id: int):
    sector = await session.get(SectorModel, sector_id)

    if not sector:
        raise NotFound(f"Sector with id {sector_id} not found.")

    await session.delete(sector)
    await session.commit()
