from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, DateTime
from models.base import BaseModel

class Patient(BaseModel):
    """
    Tracks patient demographics, blood groupings, phenotyping, and relationships.
    Enforces passive deletes to let the PostgreSQL database cascade cleanups.
    """
    __tablename__ = "patients"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    blood_type: Mapped[str] = mapped_column(String(5), nullable=False)  # A, B, AB, O
    rh_factor: Mapped[str] = mapped_column(String(1), nullable=False)   # +, -
    
    # Extended Phenotyping Flags (critical for alloimmunization care)
    kell_negative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duffy_negative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    kidd_negative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    alloimmunization_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(50), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    next_transfusion_predicted: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hb_current: Mapped[float | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    # Relationships mapped with selectin loading to prevent N+1 queries in the endpoints
    hb_readings: Mapped[list["HbReading"]] = relationship(
        "HbReading", back_populates="patient", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin"
    )
    forecasts: Mapped[list["Forecast"]] = relationship(
        "Forecast", back_populates="patient", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin"
    )
    guardians: Mapped[list["Guardian"]] = relationship(
        "Guardian", back_populates="patient", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin"
    )
