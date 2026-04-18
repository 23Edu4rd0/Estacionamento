from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.designations import Designation as DesignationModel
from models.workers import Worker as WorkerModel
from core.exceptions import Duplicate, NotFound

async def get_all_designations(session: AsyncSession):
    result = await session.scalars(
        select(DesignationModel)
    )
    return result.all()

async def get_designations_by_date(session: AsyncSession, designation_date: str):
    result = await session.scalars(
        select(DesignationModel).where(
            DesignationModel.event_date == designation_date
        )
    )
    return result.all()

async def create_designation_repo(session: AsyncSession, designation):

    verify_worker_exists = await session.get(WorkerModel, designation.worker_id)

    if not verify_worker_exists:
        raise NotFound()


    verify_duplicate = await session.scalar(
        select(DesignationModel).where(
            (DesignationModel.worker_id == designation.worker_id) &
            (DesignationModel.event_date == designation.event_date) &
            (DesignationModel.shift_start == designation.shift_start) &
            (DesignationModel.shift_end == designation.shift_end)
        )
    )

    if verify_duplicate:
        raise Duplicate()

    new_designation = DesignationModel(
        worker_id = designation.worker_id,
        event_date = designation.event_date,
        shift_start = designation.shift_start,
        shift_end = designation.shift_end,
        sector = designation.sector
    )

    session.add(new_designation)
    await session.commit()
    await session.refresh(new_designation)

    return new_designation