from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Boolean, DateTime
from models.base import BaseModel

class HbReading(BaseModel):
    """
    Logs individual patient hemoglobin values and rise characteristics.
    Triggers CUSUM anomaly calculation upon entry.
    """
    __tablename__ = "hb_readings"

    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    hb_value: Mapped[float] = mapped_column(nullable=False)
    reading_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    post_transfusion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    units_transfused: Mapped[Optional[int]] = mapped_column(nullable=True)
    hb_rise_per_unit: Mapped[Optional[float]] = mapped_column(nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="hb_readings")
