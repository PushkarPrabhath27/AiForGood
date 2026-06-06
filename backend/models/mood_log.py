from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, DateTime, Float
from models.base import BaseModel

class MoodLog(BaseModel):
    __tablename__ = "mood_logs"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    guardian_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("guardians.id", ondelete="SET NULL"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    mood_score: Mapped[int] = mapped_column(Integer, nullable=False)
    mood_label: Mapped[str] = mapped_column(String(50), nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="telegram", nullable=False)
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    calculated_risk_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", lazy="selectin")
    guardian: Mapped[Optional["Guardian"]] = relationship("Guardian", lazy="selectin")
