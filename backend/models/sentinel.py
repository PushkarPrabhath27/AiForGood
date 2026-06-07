from datetime import datetime
import enum
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, DateTime, Enum, Float, Boolean
from models.base import BaseModel

class ActivityLevel(enum.Enum):
    normal = "normal"
    reduced = "reduced"
    very_low = "very_low"

class ConcernLevel(enum.Enum):
    none = "none"
    mild = "mild"
    high = "high"

class CaregiverCheckin(BaseModel):
    __tablename__ = "caregiver_checkins"
    
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    checkin_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="telegram", nullable=False)
    raw_response: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True, default=None)
    language_detected: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    symptom_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fatigue_reported: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    appetite_normal: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activity_level: Mapped[ActivityLevel] = mapped_column(Enum(ActivityLevel), default=ActivityLevel.normal, nullable=False)
    caregiver_concern_level: Mapped[ConcernLevel] = mapped_column(Enum(ConcernLevel), default=ConcernLevel.none, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", lazy="selectin")

class SentinelAlert(BaseModel):
    __tablename__ = "sentinel_alerts"
    
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)  # symptom_spike, trend_mismatch, early_warning
    triggering_checkin_id: Mapped[str] = mapped_column(String(36), ForeignKey("caregiver_checkins.id", ondelete="CASCADE"), nullable=False)
    hb_at_trigger: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    predicted_hb_at_trigger: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    symptom_score_at_trigger: Mapped[float] = mapped_column(Float, nullable=False)
    recommended_action: Mapped[str] = mapped_column(String(500), nullable=False)
    coordinator_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", lazy="selectin")
    triggering_checkin: Mapped[CaregiverCheckin] = relationship("CaregiverCheckin", lazy="selectin")
