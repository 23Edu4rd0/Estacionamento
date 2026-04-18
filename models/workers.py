
from datetime import datetime
from sqlalchemy import String,func
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base

class Worker(Base):
    __tablename__ = 'workers'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=True, unique=True)
    congregation: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    designations: Mapped[list['Designation']] = relationship('Designation', back_populates='worker')