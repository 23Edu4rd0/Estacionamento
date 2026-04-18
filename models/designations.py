from datetime import date, time, datetime
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, ForeignKey, func
from models.base import Base


class Designation(Base):
    __tablename__ = 'designations'

    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    worker_id : Mapped[int] = mapped_column(ForeignKey('workers.id'), nullable=False)
    event_date: Mapped[date] = mapped_column(nullable=False)
    shift_start: Mapped[time] = mapped_column(nullable=False)
    shift_end: Mapped[time] = mapped_column(nullable=False)
    sector: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    worker : Mapped['Worker'] = relationship(back_populates='designations')

