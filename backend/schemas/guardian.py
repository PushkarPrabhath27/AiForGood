from __future__ import annotations
from datetime import date
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_serializer, ConfigDict

class GuardianSchema(BaseModel):
    """
    Strict schema representing a circle member or rare specialist candidate.
    Enforces privacy by masking phone numbers as phone_last4 at the serialization boundary.
    """
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: str
    patient_id: str
    name: str
    phone_last4: str = Field(..., validation_alias="phone")  # serialize as phone_last4, populate from phone attribute
    telegram_chat_id: Optional[str] = None
    role: Literal["primary", "secondary", "rare_specialist"]
    status: Literal["active", "cooldown", "pending", "unavailable", "empty"]
    last_donation_date: Optional[date] = None
    next_eligible_date: Optional[date] = None
    donation_count: int
    response_latency_avg_hours: float
    preferred_language: str
    compatibility_score: int
    reliability_score: int
    geography_score: int
    cusum_score: Optional[float] = None
    engagement_trend: Optional[str] = None
    annual_donation_count: Optional[int] = None
    fatigue_ceiling: Optional[int] = None
    fatigue_rest_until: Optional[date] = None

    @field_serializer("phone_last4")
    def serialize_phone(self, val: str) -> str:
        """Mask phone numbers to protect patient privacy."""
        if not val:
            return ""
        # Keep last 4 digits visible and mask the rest
        last_4 = val[-4:] if len(val) >= 4 else val
        return f"****{last_4}"

    @field_serializer("last_donation_date", "next_eligible_date")
    def serialize_dates(self, val: Optional[date]) -> Optional[str]:
        """Ensures dates are serialized as GFM-compliant ISO strings."""
        if val is None:
            return None
        return val.isoformat()


class GuardianCircleResponse(BaseModel):
    """
    Structured clinical response envelope for patients' RaktaMitra circles,
    incorporating coverage, engagement, and pair-survivability resilience metrics.
    """
    patient_id: str                         # ADD
    coverage_score: float = Field(..., ge=0.0, le=100.0)
    engagement_score: float = Field(..., ge=0.0, le=100.0)
    resilience_score: float = Field(..., ge=0.0, le=100.0)
    mobilization_status: str
    days_to_transfusion: Optional[int] = None  # Ensure Optional[int] compatibility
    guardians: List[GuardianSchema]


class MobilizationStatusResponse(BaseModel):
    """
    Response envelope containing current T-minus countdown details.
    """
    status: str
    days_to_transfusion: int
    confirmed_count: int
    total_count: int


class UpdateGuardianRequest(BaseModel):
    """
    Schema for updating a guardian's editable fields from the dashboard.
    """
    telegram_chat_id: Optional[str] = Field(None, max_length=20)
    preferred_language: Optional[str] = Field(None, max_length=5)


class SendGuardianMessageRequest(BaseModel):
    """
    Schema for sending a custom message to a guardian via Telegram.
    """
    message: Optional[str] = None

