from datetime import date as date_type

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import Duplicate, NotFound
from models.designations import Designation as DesignationModel
from models.sectors import Sector as SectorModel
from models.workers import Worker as WorkerModel

DESIGNATION_COLUMNS = (
    DesignationModel.id,
    DesignationModel.worker_id,
    WorkerModel.name.label("worker_name"),
    DesignationModel.event_date,
    DesignationModel.shift_start,
    DesignationModel.shift_end,
    DesignationModel.sector_id,
    SectorModel.sector.label("sector"),
    DesignationModel.confirmed_present,
    DesignationModel.substituted,
)


def _designations_query():
    return (
        select(*DESIGNATION_COLUMNS)
        .join(WorkerModel, WorkerModel.id == DesignationModel.worker_id)
        .outerjoin(SectorModel, SectorModel.id == DesignationModel.sector_id)
    )


async def get_all_designations(session: AsyncSession, event_date: date_type | None = None):
    query = _designations_query()

    if event_date is not None:
        query = query.where(DesignationModel.event_date == event_date)

    result = await session.execute(query.order_by(DesignationModel.shift_start))
    return result.all()


async def get_designation_by_id(session: AsyncSession, designation_id: int):
    query = _designations_query().where(DesignationModel.id == designation_id)
    result = await session.execute(query)
    return result.first()


async def create_designation_repo(session: AsyncSession, designation):

    verify_worker_exists = await session.get(WorkerModel, designation.worker_id)

    if not verify_worker_exists:
        raise NotFound()

    if designation.sector_id is not None:
        verify_sector_exists = await session.get(SectorModel, designation.sector_id)
        if not verify_sector_exists:
            raise NotFound()

    verify_duplicate = await session.scalar(
        select(DesignationModel).where(
            (DesignationModel.worker_id == designation.worker_id)
            & (DesignationModel.event_date == designation.event_date)
            & (DesignationModel.shift_start == designation.shift_start)
            & (DesignationModel.shift_end == designation.shift_end)
        )
    )

    if verify_duplicate:
        raise Duplicate()

    new_designation = DesignationModel(
        worker_id=designation.worker_id,
        event_date=designation.event_date,
        shift_start=designation.shift_start,
        shift_end=designation.shift_end,
        sector_id=designation.sector_id,
    )

    session.add(new_designation)
    await session.commit()
    await session.refresh(new_designation)

    return await get_designation_by_id(session, new_designation.id)


async def update_designation_status(
    session: AsyncSession, designation_id: int, status_data
):
    designation = await session.get(DesignationModel, designation_id)

    if not designation:
        raise NotFound()

    for key, value in status_data.model_dump(exclude_unset=True).items():
        setattr(designation, key, value)

    await session.commit()

    return await get_designation_by_id(session, designation_id)


async def delete_designation_repo(session: AsyncSession, designation_id: int):
    designation = await session.get(DesignationModel, designation_id)

    if not designation:
        raise NotFound()

    await session.delete(designation)
    await session.commit()
