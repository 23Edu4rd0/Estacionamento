from datetime import date, datetime, time

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.workers import Worker


class Designation(Base):
    __tablename__ = "designations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), nullable=False)
    event_date: Mapped[date] = mapped_column(nullable=False)
    shift_start: Mapped[time] = mapped_column(nullable=False)
    shift_end: Mapped[time] = mapped_column(nullable=False)
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectors.id"))

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    worker: Mapped["Worker"] = relationship(back_populates="designations")
    sector: Mapped["Sector"] = relationship(back_populates="designation")
