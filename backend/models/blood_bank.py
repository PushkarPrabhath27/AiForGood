from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime
from models.base import BaseModel

class BloodBank(BaseModel):
    """
    Tracks localized blood bank entities and coordination sync parameters.
    Enforces selectin loading to prevent N+1 relationship query issues.
    """
    __tablename__ = "blood_banks"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(10), nullable=False)  # HYD, etc.
    lat: Mapped[float] = mapped_column(nullable=False)
    lng: Mapped[float] = mapped_column(nullable=False)
    api_endpoint: Mapped[str | None] = mapped_column(String(200), nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    inventory: Mapped[list["Inventory"]] = relationship(
        "Inventory", back_populates="bank", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin"
    )
