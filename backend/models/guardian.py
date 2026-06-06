from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, DateTime, CheckConstraint, Date, Boolean
from models.base import BaseModel

class Guardian(BaseModel):
    """
    Tracks permanent relational donor circles mapped to patients.
    Implements a strict status constraint mapping API requirements.
    """
    __tablename__ = "guardians"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'cooldown', 'pending', 'unavailable', 'empty')",
            name="check_guardian_status"
        ),
    )

    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # primary, secondary, rare_specialist
    status: Mapped[str] = mapped_column(String(20), nullable=False) # active, cooldown, pending, unavailable, empty
    
    last_donation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_eligible_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    donation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    response_latency_avg_hours: Mapped[float] = mapped_column(default=72.0, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(5), default="en", nullable=False)
    
    # Internal Relational scoring parameters
    compatibility_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reliability_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    geography_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Donor Fatigue Tracking
    annual_donation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fatigue_ceiling: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    fatigue_rest_until: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    fatigue_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="guardians")
