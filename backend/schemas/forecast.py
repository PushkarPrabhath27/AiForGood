from datetime import date, datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_serializer, ConfigDict

class HbReadingSchema(BaseModel):
    """
    Strict Pydantic schema representing individual patient hemoglobin log records.
    Ensures precise dates are serialized as GFM-compliant ISO strings.
    """
    id: str
    hb_value: float
    reading_date: date
    post_transfusion: bool
    units_transfused: Optional[int] = None
    hb_rise_per_unit: Optional[float] = None

    @field_serializer("reading_date")
    def serialize_date(self, val: date) -> str:
        """Serializes date to GFM-compliant ISO string format."""
        return val.isoformat()


class ForecastPointSchema(BaseModel):
    """
    Strict schema mapping individual daily forecast coordinates for the 60-day prediction curve.
    """
    date: date
    hb_predicted: float
    ci_lower: float
    ci_upper: float

    @field_serializer("date")
    def serialize_date(self, val: date) -> str:
        """Serializes date to GFM-compliant ISO string format."""
        return val.isoformat()


class AlertFlagSchema(BaseModel):
    """
    Clinical and logistical warning alert envelope.
    """
    type: Literal["iron_overload", "alloimmunization", "rapid_decline", "circle_degraded", "inventory_shortage"]
    severity: Literal["info", "warning", "critical"]
    message: str
    recommended_action: str
    detected_at: datetime

    @field_serializer("detected_at")
    def serialize_datetime(self, val: datetime) -> str:
        """Serializes datetime to GFM-compliant ISO datetime string."""
        return val.isoformat()


class ForecastResponse(BaseModel):
    """
    Complete clinical diagnostic output from the NOOR forecasting pipeline.
    """
    model_config = ConfigDict(protected_namespaces=())

    patient_id: str
    historical_readings: List[HbReadingSchema]
    forecast_points: List[ForecastPointSchema]
    predicted_transfusion_date: date
    confidence_lower: date
    confidence_upper: date
    confidence_pct: float = Field(..., ge=0.0, le=100.0)
    alert_flags: List[AlertFlagSchema]
    model_version: str
    generated_at: datetime
    status: Literal["success", "insufficient_data", "model_error", "cached"]

    @field_serializer("predicted_transfusion_date", "confidence_lower", "confidence_upper")
    def serialize_dates(self, val: date) -> str:
        """Serializes dates to GFM-compliant ISO string format."""
        return val.isoformat()

    @field_serializer("generated_at")
    def serialize_datetime(self, val: datetime) -> str:
        """Serializes generated_at timestamp to GFM-compliant ISO string."""
        return val.isoformat()
