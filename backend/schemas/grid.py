from __future__ import annotations
from datetime import datetime, date
from typing import List, Dict, Literal
from pydantic import BaseModel, Field, ConfigDict

class BloodBankNodeSchema(BaseModel):
    """Schema representing a blood bank node in the optimization grid."""
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    name: str
    city: str
    lat: float
    lng: float
    status: Literal["green", "yellow", "red"] = "green"
    inventory_summary: Dict[str, int] = Field(default_factory=dict)
    is_stale: bool = False
    last_sync_at: datetime | None = None

class TypeCoverageSchema(BaseModel):
    """Schema tracking coverage performance metrics for specific blood groups."""
    model_config = ConfigDict(protected_namespaces=())

    units_available: int
    days_covered: float
    status: Literal["green", "yellow", "red"]

class InventoryMatchSchema(BaseModel):
    """Schema representing a single clinical inventory-to-patient transfer match."""
    model_config = ConfigDict(protected_namespaces=())

    id: str                                 # RENAME from unit_id
    patient_id: str
    patient_name: str
    bank_id: str
    bank_name: str
    blood_group: str                        # ADD (combined "B+", etc.)
    extended_phenotype_match: bool          # ADD
    units_available: int                    # ADD
    expiry_date: date                       # Match date expectation
    days_until_expiry: int                  # ADD
    urgency: Literal["routine", "urgent", "critical"]  # ADD
    distance_km: float
    recommended_action: str                 # ADD
    status: Literal["pending", "approved", "rejected", "completed"]

class CityInventoryResponse(BaseModel):
    """Schema representing the optimization summary and mappings for a city."""
    model_config = ConfigDict(protected_namespaces=())

    city_code: str                          # ADD
    city_health_score: float
    health_status: Literal["green", "yellow", "red"]  # ADD
    last_optimized_at: datetime             # ADD
    blood_banks: List[BloodBankNodeSchema]  # RENAME from banks
    active_matches: List[InventoryMatchSchema]  # RENAME from matches
    coverage_by_type: Dict[str, TypeCoverageSchema]  # RESTRUCTURE from inventory_summary

class InventoryItemSchema(BaseModel):
    """Schema for a single inventory item to ingest or update."""
    model_config = ConfigDict(protected_namespaces=())

    blood_type: str = Field(..., description="ABO grouping, e.g., 'A', 'B', 'AB', 'O'")
    rh_factor: str = Field(..., description="Rh factor: '+' or '-'")
    units_available: int = Field(..., ge=0, description="Number of units available")
    kell: bool = Field(default=False, description="Is Kell-negative")
    duffy: bool = Field(default=False, description="Is Duffy-negative")
    kidd: bool = Field(default=False, description="Is Kidd-negative")
    collection_date: datetime = Field(..., description="Collection timestamp")
    expiry_date: datetime = Field(..., description="Expiry timestamp")

class BulkInventoryUpsertSchema(BaseModel):
    """Payload schema for bulk upserting a blood bank's inventory."""
    model_config = ConfigDict(protected_namespaces=())

    items: List[InventoryItemSchema]
