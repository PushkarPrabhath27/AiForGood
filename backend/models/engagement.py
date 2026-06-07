from datetime import datetime, date
import enum
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, DateTime, Date, Enum, Float, Boolean
from models.base import BaseModel

class ResponseType(enum.Enum):
    confirmed = "confirmed"
    declined = "declined"
    no_response = "no_response"

class EngagementTrend(enum.Enum):
    stable = "stable"
    declining = "declining"
    critical = "critical"

class DonorEngagementSignal(BaseModel):
    __tablename__ = "donor_engagement_signals"
    
    guardian_id: Mapped[str] = mapped_column(String(36), ForeignKey("guardians.id", ondelete="CASCADE"), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    contacted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    response_latency_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None)
    response_type: Mapped[ResponseType] = mapped_column(Enum(ResponseType), default=ResponseType.no_response, nullable=False)
    message_channel: Mapped[str] = mapped_column(String(20), default="telegram", nullable=False)

    # Relationships
    guardian: Mapped["Guardian"] = relationship("Guardian", lazy="selectin")
    patient: Mapped["Patient"] = relationship("Patient", lazy="selectin")

class DonorChurnScore(BaseModel):
    __tablename__ = "donor_churn_scores"
    
    guardian_id: Mapped[str] = mapped_column(String(36), ForeignKey("guardians.id", ondelete="CASCADE"), unique=True, nullable=False)
    cusum_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    engagement_trend: Mapped[EngagementTrend] = mapped_column(Enum(EngagementTrend), default=EngagementTrend.stable, nullable=False)
    predicted_churn_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, default=None)
    reengagement_attempted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reengagement_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    # Relationships
    guardian: Mapped["Guardian"] = relationship("Guardian", lazy="selectin")
