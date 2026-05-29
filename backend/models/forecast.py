from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, DateTime
from models.base import BaseModel

class Forecast(BaseModel):
    """
    Caches per-patient Prophet hemoglobin prediction outputs metadata.
    The detailed 60-day forecast points reside in Redis rather than PostgreSQL.
    """
    __tablename__ = "forecasts"

    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    predicted_transfusion_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confidence_lower: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confidence_upper: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confidence_pct: Mapped[float] = mapped_column(nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # success, cached, insufficient_data

    patient: Mapped["Patient"] = relationship("Patient", back_populates="forecasts")
