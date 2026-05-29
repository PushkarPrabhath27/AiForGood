from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, DateTime
from models.base import BaseModel

class Alert(BaseModel):
    """Logs clinically critical iron-overloads and low-mobilization events."""
    __tablename__ = "alerts"

    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    alert_type: Mapped[str] = mapped_column(String(30), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # info, warning, critical
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    recommended_action: Mapped[str] = mapped_column(String(500), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
