"""
Compatibility Graph Service — Innovation 2: RaktaGrid Compatibility Graph.

Manages DynamoDB-backed donor-patient compatibility edges. Each edge stores
a composite compatibility vector (blood type, phenotype, geography, latency)
that powers the RaktaGrid matching algorithm without hitting RDS on the hot path.

DynamoDB Schema:
    Table: DonorCompatibilityEdges (PAY_PER_REQUEST)
    PK: donor_id (String)     — guardian UUID
    SK: patient_id (String)   — patient UUID
    Attributes:
        blood_type_match     (Boolean)
        phenotype_score      (Number)  — 0–20
        geography_score      (Number)  — 0–20
        latency_score        (Number)  — 0–20
        composite_score      (Number)  — 0–100
        last_updated         (String)  — ISO-8601
        eligible             (Boolean) — False if in fatigue rest
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

from core.logging import logger

# ─── AWS Config ──────────────────────────────────────────────────────────────
_REGION = "us-east-1"
_TABLE_NAME = "DonorCompatibilityEdges"

# Compatibility weight constants (must match guardian_service.py scoring)
_PHENOTYPE_MAX = 20
_GEO_MAX = 20
_LATENCY_MAX = 20
_BLOOD_MAX = 40


def _get_table():
    """Lazy factory: return the DynamoDB Table resource.

    Returns:
        boto3.resources.factory.dynamodb.Table: The DynamoDB table resource.
    """
    ddb = boto3.resource("dynamodb", region_name=_REGION)
    return ddb.Table(_TABLE_NAME)


def _compute_latency_score(response_latency_avg_hours: float) -> int:
    """Map average response latency to a 0–20 latency score.

    Args:
        response_latency_avg_hours: Donor's average response latency.

    Returns:
        int: Latency score in [0, 20].

    Notes:
        O(1) time · O(1) space.
    """
    if response_latency_avg_hours <= 12.0:
        return _LATENCY_MAX
    if response_latency_avg_hours >= 72.0:
        return 0
    return int(round(_LATENCY_MAX * (1.0 - (response_latency_avg_hours - 12.0) / 60.0)))


def upsert_compatibility_edge(
    donor_id: str,
    patient_id: str,
    blood_type_match: bool,
    phenotype_score: int,
    geography_score: int,
    response_latency_avg_hours: float,
    eligible: bool = True,
) -> Dict[str, Any]:
    """Write or overwrite a donor-patient compatibility edge in DynamoDB.

    Args:
        donor_id:                   Guardian UUID (DynamoDB PK).
        patient_id:                 Patient UUID (DynamoDB SK).
        blood_type_match:           True if blood groups are ABO-compatible.
        phenotype_score:            Extended phenotype compatibility score [0, 20].
        geography_score:            Geographic proximity score [0, 20].
        response_latency_avg_hours: Donor's historical average response latency.
        eligible:                   False if donor is in fatigue rest period.

    Returns:
        Dict[str, Any]: Written edge attributes.

    Raises:
        ClientError: On DynamoDB service errors.
    """
    latency_score = _compute_latency_score(response_latency_avg_hours)
    blood_score = _BLOOD_MAX if blood_type_match else 0
    composite = blood_score + phenotype_score + geography_score + latency_score

    item = {
        "donor_id": donor_id,
        "patient_id": patient_id,
        "blood_type_match": blood_type_match,
        "phenotype_score": phenotype_score,
        "geography_score": geography_score,
        "latency_score": latency_score,
        "composite_score": composite,
        "eligible": eligible,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }

    try:
        table = _get_table()
        table.put_item(Item=item)
        logger.info(
            "compatibility_edge_upserted",
            donor_id=donor_id,
            patient_id=patient_id,
            composite=composite,
        )
    except ClientError as exc:
        logger.error(
            "compatibility_edge_upsert_failed",
            donor_id=donor_id,
            patient_id=patient_id,
            error=str(exc),
        )
        raise

    return item


def get_compatible_donors(
    patient_id: str,
    min_composite: int = 40,
    eligible_only: bool = True,
) -> List[Dict[str, Any]]:
    """Query all donor edges for a patient, filtered by composite threshold.

    Uses a DynamoDB Scan with FilterExpression because the table is keyed
    donor-first; for a hackathon dataset this is acceptable. Production
    would use a GSI on patient_id.

    Args:
        patient_id:    Patient UUID to match against.
        min_composite: Minimum composite score to include (default 40).
        eligible_only: If True, exclude donors on fatigue rest.

    Returns:
        List[Dict]: Matched edge items, sorted by composite_score descending.

    Notes:
        O(n) DynamoDB scan — acceptable for ≤500 edges in the demo dataset.
    """
    from boto3.dynamodb.conditions import Attr

    try:
        table = _get_table()
        filter_expr = Attr("patient_id").eq(patient_id) & Attr("composite_score").gte(min_composite)
        if eligible_only:
            filter_expr = filter_expr & Attr("eligible").eq(True)

        response = table.scan(FilterExpression=filter_expr)
        items = response.get("Items", [])

        # Handle pagination (unlikely in demo, defensive)
        while "LastEvaluatedKey" in response:
            response = table.scan(
                FilterExpression=filter_expr,
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            items.extend(response.get("Items", []))

        items.sort(key=lambda x: int(x.get("composite_score", 0)), reverse=True)
        logger.info(
            "compatibility_edges_queried",
            patient_id=patient_id,
            matched=len(items),
        )
        return items

    except ClientError as exc:
        logger.error(
            "compatibility_edges_query_failed",
            patient_id=patient_id,
            error=str(exc),
        )
        return []


def mark_donor_ineligible(donor_id: str, patient_id: str) -> None:
    """Set eligible=False on a specific donor-patient edge (fatigue enforcement).

    Args:
        donor_id:   Guardian UUID.
        patient_id: Patient UUID.
    """
    try:
        table = _get_table()
        table.update_item(
            Key={"donor_id": donor_id, "patient_id": patient_id},
            UpdateExpression="SET eligible = :e, last_updated = :t",
            ExpressionAttributeValues={
                ":e": False,
                ":t": datetime.now(timezone.utc).isoformat(),
            },
        )
        logger.info("compatibility_edge_marked_ineligible", donor_id=donor_id, patient_id=patient_id)
    except ClientError as exc:
        logger.error(
            "compatibility_edge_mark_ineligible_failed",
            donor_id=donor_id,
            patient_id=patient_id,
            error=str(exc),
        )
        raise


def mark_donor_eligible(donor_id: str, patient_id: str) -> None:
    """Restore eligible=True when a donor's fatigue rest period ends.

    Args:
        donor_id:   Guardian UUID.
        patient_id: Patient UUID.
    """
    try:
        table = _get_table()
        table.update_item(
            Key={"donor_id": donor_id, "patient_id": patient_id},
            UpdateExpression="SET eligible = :e, last_updated = :t",
            ExpressionAttributeValues={
                ":e": True,
                ":t": datetime.now(timezone.utc).isoformat(),
            },
        )
        logger.info("compatibility_edge_restored_eligible", donor_id=donor_id, patient_id=patient_id)
    except ClientError as exc:
        logger.error(
            "compatibility_edge_restore_failed",
            donor_id=donor_id,
            patient_id=patient_id,
            error=str(exc),
        )
        raise


def get_edge(donor_id: str, patient_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single compatibility edge by its composite key.

    Args:
        donor_id:   Guardian UUID (PK).
        patient_id: Patient UUID (SK).

    Returns:
        Optional[Dict]: The edge item, or None if not found.
    """
    try:
        table = _get_table()
        response = table.get_item(Key={"donor_id": donor_id, "patient_id": patient_id})
        return response.get("Item")
    except ClientError as exc:
        logger.error("compatibility_edge_get_failed", error=str(exc))
        return None
