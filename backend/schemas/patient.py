from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_serializer, ConfigDict

class PatientSchema(BaseModel):
    """
    Schema representing core patient details in the RaktaSetu ecosystem.
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    age: int
    blood_type: str
    rh_factor: str
    kell_negative: bool
    duffy_negative: bool
    kidd_negative: bool
    alloimmunization_flag: bool
    hospital_id: str
    enrolled_at: datetime
    next_transfusion_predicted: Optional[datetime] = None
    hb_current: Optional[float] = None

    @field_serializer("enrolled_at")
    def serialize_datetime(self, val: datetime) -> str:
        """Serializes enrolled_at to ISO datetime string."""
        return val.isoformat()

    @field_serializer("next_transfusion_predicted")
    def serialize_transfusion_date(self, val: Optional[datetime]) -> Optional[str]:
        """Serializes next_transfusion_predicted date/datetime to ISO date string or None."""
        if val is None:
            return None
        return val.date().isoformat()

class PatientListResponse(BaseModel):
    """
    Envelope for patient directory list responses.
    """
    patients: List[PatientSchema]
    total: int
    page: int

class PatientDetail(PatientSchema):
    """
    Detailed patient schema including base fields.
    """
    pass

class HbReadingCreate(BaseModel):
    """
    Input schema for logging new hemoglobin check readings.
    """
    hb_value: float = Field(..., ge=0.0, le=20.0)
    reading_date: date
    post_transfusion: bool
    units_transfused: Optional[int] = None

class HbReadingResponse(BaseModel):
    """
    Response schema for a successfully logged Hb reading record.
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    patient_id: str
    hb_value: float
    reading_date: date
    post_transfusion: bool
    units_transfused: Optional[int] = None
    hb_rise_per_unit: Optional[float] = None

    @field_serializer("reading_date")
    def serialize_date(self, val: date) -> str:
        """Serializes reading_date to ISO date string."""
        return val.isoformat()
