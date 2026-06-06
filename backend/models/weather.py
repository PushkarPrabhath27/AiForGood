from datetime import datetime, date
import enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, Date, Enum, Float
from models.base import BaseModel

class GapSeverity(enum.Enum):
    surplus = "surplus"
    balanced = "balanced"
    shortage = "shortage"
    critical = "critical"

class BloodWeatherForecast(BaseModel):
    __tablename__ = "blood_weather_forecasts"
    
    city_code: Mapped[str] = mapped_column(String(20), nullable=False)
    forecast_week_start: Mapped[date] = mapped_column(Date, nullable=False)
    blood_type: Mapped[str] = mapped_column(String(10), nullable=False)  # A+, A-, B+, etc.
    predicted_demand_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_supply_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gap_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gap_severity: Mapped[GapSeverity] = mapped_column(Enum(GapSeverity), default=GapSeverity.balanced, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    model_confidence: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
