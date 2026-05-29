from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, Boolean, DateTime
from models.base import BaseModel

class Inventory(BaseModel):
    """Tracks expiring blood units, groups, and antigen phenotyping flags."""
    __tablename__ = "inventory"

    bank_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("blood_banks.id", ondelete="CASCADE"), nullable=False
    )
    blood_type: Mapped[str] = mapped_column(String(5), nullable=False)
    rh_factor: Mapped[str] = mapped_column(String(1), nullable=False)
    
    # Extended phenotyping specifications
    kell: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duffy: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    kidd: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    units_available: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    collection_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expiry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    bank: Mapped["BloodBank"] = relationship("BloodBank", back_populates="inventory")
