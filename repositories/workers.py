from models.workers import Worker as WorkerModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections.abc import Sequence
from core.exceptions import WorkerNotFound, DuplicateWorker


async def get_all_workers(session : AsyncSession) -> Sequence[WorkerModel]:
    result = await session.scalars(
        select(WorkerModel)
    )
    
    return result.all()

async def create_worker(session : AsyncSession, worker) -> WorkerModel | None:

    verify_duplicate = await session.scalar(
        select(WorkerModel).where(
            (WorkerModel.name == worker.name) | (WorkerModel.phone_number == worker.phone_number)
        )
    )

    if verify_duplicate:
        raise DuplicateWorker()
    
    new_worker = WorkerModel(
        name=worker.name,
        phone_number = worker.phone_number,
        congregation = worker.congregation,
    )

    session.add(new_worker)
    await session.commit()
    await session.refresh(new_worker)

    return new_worker



async def update_worker(session: AsyncSession, worker_id: int, worker_data) -> WorkerModel | None:
    target_worker = await session.get(WorkerModel, worker_id)

    if not target_worker:
        raise WorkerNotFound()
    
    update_fiels = worker_data.model_dump(exclude_unset=True)

    if 'phone_number' in update_fiels:
        verify_duplicate = await session.scalar(
            select(WorkerModel).where(
                (WorkerModel.phone_number == update_fiels['phone_number']) &
                (WorkerModel.id != worker_id)
            )
        )

        if verify_duplicate:
            raise DuplicateWorker()
        
    for key, value in update_fiels.items():
        setattr(target_worker, key, value)

    session.add(target_worker)
    await session.commit()
    await session.refresh(target_worker)

    return target_worker



async def delete_worker(session: AsyncSession, worker_id: int) -> None:
    target_worker = await session.get(WorkerModel, worker_id)

    if not target_worker:
        raise WorkerNotFound()
    
    await session.delete(target_worker)
    await session.commit()
    