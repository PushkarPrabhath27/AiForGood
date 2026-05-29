from __future__ import annotations
import logging
from typing import Any
from core.constants import COMPATIBILITY_MATRIX

logger = logging.getLogger(__name__)

def is_compatible(patient: Any, unit: Any) -> bool:
    """
    Determines clinical compatibility between a patient and an inventory blood unit.
    
    Checks standard ABO/Rh compatibility using the COMPATIBILITY_MATRIX.
    If the patient is alloimmunized (alloimmunization_flag is True), also enforces
    strict antigen-specific phenotyping rules:
    - If the patient is Kell-negative, the donor unit must be Kell-negative (represented by unit.kell == True).
    - If the patient is Duffy-negative, the donor unit must be Duffy-negative (represented by unit.duffy == True).
    - If the patient is Kidd-negative, the donor unit must be Kidd-negative (represented by unit.kidd == True).

    Args:
        patient (Any): An instance of Patient (or an object/dict with compatible attributes).
        unit (Any): An instance of Inventory (or an object/dict with compatible attributes).

    Returns:
        bool: True if the patient can clinically receive this blood unit, False otherwise.
    """
    # 1. Extract and validate patient blood group attributes
    try:
        p_blood_type = getattr(patient, "blood_type", None)
        p_rh_factor = getattr(patient, "rh_factor", None)
        if not p_blood_type or not p_rh_factor:
            logger.warning("Invalid patient blood grouping attributes passed to matcher.")
            return False
        patient_group = f"{p_blood_type}{p_rh_factor}"

        # 2. Extract and validate unit blood group attributes
        u_blood_type = getattr(unit, "blood_type", None)
        u_rh_factor = getattr(unit, "rh_factor", None)
        if not u_blood_type or not u_rh_factor:
            logger.warning("Invalid unit blood grouping attributes passed to matcher.")
            return False
        unit_group = f"{u_blood_type}{u_rh_factor}"
    except Exception as e:
        logger.error(f"Error extracting blood group attributes: {str(e)}")
        return False

    # 3. Check ABO/Rh compatibility
    if patient_group not in COMPATIBILITY_MATRIX:
        logger.warning(f"Patient blood group '{patient_group}' not found in COMPATIBILITY_MATRIX.")
        return False

    allowed_donor_groups = COMPATIBILITY_MATRIX[patient_group]
    if unit_group not in allowed_donor_groups:
        return False

    # 4. Check Extended Phenotyping if patient is alloimmunized
    p_alloimmunization_flag = getattr(patient, "alloimmunization_flag", False)
    if p_alloimmunization_flag:
        p_kell_neg = getattr(patient, "kell_negative", False)
        p_duffy_neg = getattr(patient, "duffy_negative", False)
        p_kidd_neg = getattr(patient, "kidd_negative", False)

        u_kell = getattr(unit, "kell", False)
        u_duffy = getattr(unit, "duffy", False)
        u_kidd = getattr(unit, "kidd", False)

        if p_kell_neg and not u_kell:
            return False
        if p_duffy_neg and not u_duffy:
            return False
        if p_kidd_neg and not u_kidd:
            return False

    return True
