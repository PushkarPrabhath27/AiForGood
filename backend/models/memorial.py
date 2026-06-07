from typing import Optional
from datetime import datetime
import enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, DateTime, Enum, Boolean, Text
from models.base import BaseModel

class RepairStatus(enum.Enum):
    initiated = "initiated"
    replacement_found = "replacement_found"
    completed = "completed"
    failed = "failed"

class CircleRepairLog(BaseModel):
    __tablename__ = "circle_repair_log"
    
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    departing_guardian_id: Mapped[str] = mapped_column(String(36), ForeignKey("guardians.id", ondelete="CASCADE"), nullable=False)
    replacement_guardian_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("guardians.id", ondelete="SET NULL"), nullable=True, default=None)
    repair_initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    repair_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    transition_message_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[RepairStatus] = mapped_column(Enum(RepairStatus), default=RepairStatus.initiated, nullable=False)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", foreign_keys=[patient_id], lazy="selectin")
    departing_guardian: Mapped["Guardian"] = relationship("Guardian", foreign_keys=[departing_guardian_id], lazy="selectin")
    replacement_guardian: Mapped["Guardian"] = relationship("Guardian", foreign_keys=[replacement_guardian_id], lazy="selectin")

class GuardianMemorialMessage(BaseModel):
    __tablename__ = "guardian_memorial_messages"
    
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    guardian_id: Mapped[str] = mapped_column(String(36), ForeignKey("guardians.id", ondelete="CASCADE"), nullable=False)
    total_donations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_days_supported: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    transition_consent_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    transition_patient_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, default=None)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", foreign_keys=[patient_id], lazy="selectin")
    guardian: Mapped["Guardian"] = relationship("Guardian", foreign_keys=[guardian_id], lazy="selectin")
    transition_patient: Mapped["Patient"] = relationship("Patient", foreign_keys=[transition_patient_id], lazy="selectin")
