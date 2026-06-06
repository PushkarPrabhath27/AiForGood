from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from schemas.common import ApiResponse

router = APIRouter(prefix="/graph", tags=["Cross-Patient Matching"])


class RouteRequest(BaseModel):
    donor_id: str
    patient_id: str
    message: Optional[str] = None


@router.get("/city/{city_code}/cross-patient-matches", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_cross_patient_matches(city_code: str) -> ApiResponse[List[Dict[str, Any]]]:
    return ApiResponse(success=True, data=[], error=None)


@router.post("/route", response_model=ApiResponse[Dict[str, Any]])
async def route_donor(body: RouteRequest) -> ApiResponse[Dict[str, Any]]:
    return ApiResponse(
        success=True,
        data={"status": "routed", "message": f"Donor {body.donor_id} routed to patient {body.patient_id}."},
        error=None,
    )
