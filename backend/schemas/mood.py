from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_serializer, ConfigDict


class MoodLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    guardian_id: Optional[str] = None
    timestamp: datetime
    mood_score: int
    mood_label: str
    source: str
    telegram_chat_id: Optional[str] = None
    calculated_risk_multiplier: float

    @field_serializer("timestamp")
    def serialize_timestamp(self, val: datetime) -> str:
        return val.isoformat()


class MoodLogListResponse(BaseModel):
    logs: List[MoodLogResponse]
    total: int


class MoodCheckTriggerResponse(BaseModel):
    status: str
    message: str
    chat_id: Optional[str] = None
