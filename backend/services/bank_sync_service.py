from __future__ import annotations
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.blood_bank import BloodBank
from models.inventory import Inventory
from core.exceptions import BloodBankNotFoundError

logger = logging.getLogger(__name__)

def parse_whatsapp_inventory(text: str) -> Dict[str, Any]:
    """
    Ingests and parses unstructured WhatsApp-style inventory update messages.
    
    Format: "BankName: Type1 Count, Type2 Count"
    Example: "Apollo: B+ 3 units, O- 2 units" or "Yashoda Hospital: A- 5, AB+ 1"

    Args:
        text (str): The raw text message to parse.

    Returns:
        Dict[str, Any]: A structured dictionary containing:
            - bank_name (str): Parsed blood bank name (empty if not specified).
            - items (List[Dict[str, Any]]): List of parsed inventory item dicts.
    """
    # Complexity: O(N) time where N = len(text) · O(M) space where M = number of matches
    logger.info(f"Parsing WhatsApp styled inventory update: '{text}'")
    
    # 1. Parse Bank Name
    bank_name = ""
    inventory_part = text
    if ":" in text:
        parts = text.split(":", 1)
        bank_name = parts[0].strip()
        inventory_part = parts[1].strip()

    # 2. Extract Blood Types, Rh Factors, and Quantities using regular expressions
    # Matches patterns like B+, O-, AB+, A+ followed by spacing and digits
    pattern = re.compile(r'\b(AB|A|B|O)\s*([+-])\s*(\d+)', re.IGNORECASE)
    matches = pattern.findall(inventory_part)

    now = datetime.now()
    default_expiry = now + timedelta(days=35)  # Standard packed red blood cells shelf-life of 35 days

    parsed_items: List[Dict[str, Any]] = []
    for blood_type, rh_factor, quantity in matches:
        parsed_items.append({
            "blood_type": blood_type.upper(),
            "rh_factor": rh_factor,
            "units_available": int(quantity),
            "kell": False,
            "duffy": False,
            "kidd": False,
            "collection_date": now,
            "expiry_date": default_expiry
        })

    logger.info(f"Parsed {len(parsed_items)} inventory items for blood bank '{bank_name}'.")
    return {
        "bank_name": bank_name,
        "items": parsed_items
    }

async def sync_bank_inventory(
    db: AsyncSession,
    bank_id: str,
    items: List[Any]
) -> None:
    """
    Synchronizes blood bank inventories by updating the last sync timestamp
    and completely replacing the existing inventory with the new batch.

    Args:
        db (AsyncSession): Active async SQLAlchemy database session.
        bank_id (str): The ID of the target blood bank.
        items (List[Any]): List of inventory item objects or dictionaries to upsert.

    Raises:
        BloodBankNotFoundError: If the blood bank with the given ID does not exist.
    """
    # 1. Verify blood bank existence
    stmt = select(BloodBank).where(BloodBank.id == bank_id)
    result = await db.execute(stmt)
    bank = result.scalar_one_or_none()
    if not bank:
        raise BloodBankNotFoundError(f"BloodBank with ID '{bank_id}' not found.")

    # 2. Update Sync Timestamp
    bank.last_sync_at = datetime.now()

    # 3. Clean up existing inventory items for this blood bank
    del_stmt = delete(Inventory).where(Inventory.bank_id == bank_id)
    await db.execute(del_stmt)

    # 4. Insert new inventory items
    new_records: List[Inventory] = []
    for item in items:
        # Support both Pydantic schema objects and raw dictionaries
        blood_type = getattr(item, "blood_type", None) or item.get("blood_type")
        rh_factor = getattr(item, "rh_factor", None) or item.get("rh_factor")
        units_available = getattr(item, "units_available", None) if hasattr(item, "units_available") else item.get("units_available", 0)
        
        kell = getattr(item, "kell", False) if hasattr(item, "kell") else item.get("kell", False)
        duffy = getattr(item, "duffy", False) if hasattr(item, "duffy") else item.get("duffy", False)
        kidd = getattr(item, "kidd", False) if hasattr(item, "kidd") else item.get("kidd", False)

        collection_date = getattr(item, "collection_date", None) or item.get("collection_date") or datetime.now()
        expiry_date = getattr(item, "expiry_date", None) or item.get("expiry_date") or (datetime.now() + timedelta(days=35))

        new_records.append(
            Inventory(
                bank_id=bank_id,
                blood_type=blood_type,
                rh_factor=rh_factor,
                units_available=units_available,
                kell=kell,
                duffy=duffy,
                kidd=kidd,
                collection_date=collection_date,
                expiry_date=expiry_date
            )
        )

    if new_records:
        db.add_all(new_records)
    
    await db.commit()
    logger.info(f"Inventory sync completed successfully for bank '{bank.name}' ({bank_id}) with {len(new_records)} items.")
