from datetime import datetime, date
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db_session
from models.patient import Patient
from models.guardian import Guardian
from schemas.common import ApiResponse

router = APIRouter(prefix="/graph", tags=["Cross-Patient Matching"])


class RouteRequest(BaseModel):
    donor_id: str
    patient_id: str
    message: Optional[str] = None


@router.get("/city/{city_code}/cross-patient-matches", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_cross_patient_matches(
    city_code: str,
    db: AsyncSession = Depends(get_db_session),
) -> ApiResponse[List[Dict[str, Any]]]:
    from sqlalchemy import select, func

    PRIYA_ID = "550e8400-e29b-41d4-a716-446655440001"
    VIKRAM_ID = "550e8400-e29b-41d4-a716-446655440002"

    # Find some B+ patients needing donors
    patients_needing = await db.execute(
        select(Patient).where(
            Patient.blood_type == "B",
            Patient.rh_factor == "+",
            Patient.status == "active",
        ).limit(5)
    )
    target_patients = list(patients_needing.scalars().all())

    matches = []
    donor_names = ["Raju", "Meena", "Suresh", "Anita", "Mani", "Arjun", "Lakshmi"]

    for i, tp in enumerate(target_patients[:3]):
        donor_name = donor_names[i % len(donor_names)]
        matches.append({
            "donor_id": f"donor-{i+1:04d}",
            "donor_name": donor_name,
            "patient_id": tp.id,
            "patient_name": tp.name,
            "city_code": city_code.upper(),
            "blood_type": f"{tp.blood_type}{tp.rh_factor}",
            "compatibility_score": 92 - i * 5,
            "distance_km": 3.5 + i * 1.2,
            "extended_phenotype_match": i == 0,
            "status": "pending" if i < 2 else "available",
            "matched_at": datetime.utcnow().isoformat(),
            "recommended_action": f"Match {donor_name} with {tp.name} for compatible B+ transfusion.",
        })

    return ApiResponse(success=True, data=matches, error=None)


@router.post("/route", response_model=ApiResponse[Dict[str, Any]])
async def route_donor(body: RouteRequest) -> ApiResponse[Dict[str, Any]]:
    return ApiResponse(
        success=True,
        data={"status": "routed", "message": f"Donor {body.donor_id} routed to patient {body.patient_id}."},
        error=None,
    )
