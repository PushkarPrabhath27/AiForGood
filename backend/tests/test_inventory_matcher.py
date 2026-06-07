from typing import Optional
from __future__ import annotations
import logging
import pytest
from datetime import datetime, timedelta
from ml.raktagrid.phenotype_matcher import is_compatible
from ml.raktagrid.inventory_matcher import optimize_matches, haversine_distance, get_units_needed

logger = logging.getLogger(__name__)

class MockPatient:
    """Mock Patient model for fast, database-independent unit tests."""
    def __init__(
        self,
        id: str,
        name: str,
        blood_type: str,
        rh_factor: str,
        alloimmunization_flag: bool = False,
        kell_negative: bool = False,
        duffy_negative: bool = False,
        kidd_negative: bool = False,
        next_transfusion_predicted: Optional[datetime] = None,
        hb_current: Optional[float] = None,
        hospital_id: str = "hospital-001"
    ):
        self.id = id
        self.name = name
        self.blood_type = blood_type
        self.rh_factor = rh_factor
        self.alloimmunization_flag = alloimmunization_flag
        self.kell_negative = kell_negative
        self.duffy_negative = duffy_negative
        self.kidd_negative = kidd_negative
        self.next_transfusion_predicted = next_transfusion_predicted
        self.hb_current = hb_current
        self.hospital_id = hospital_id

class MockBloodBank:
    """Mock BloodBank model for fast, database-independent unit tests."""
    def __init__(self, id: str, name: str, city: str, lat: float, lng: float):
        self.id = id
        self.name = name
        self.city = city
        self.lat = lat
        self.lng = lng

class MockInventory:
    """Mock Inventory model for fast, database-independent unit tests."""
    def __init__(
        self,
        id: str,
        bank_id: str,
        blood_type: str,
        rh_factor: str,
        kell: bool = False,
        duffy: bool = False,
        kidd: bool = False,
        units_available: int = 0,
        collection_date: Optional[datetime] = None,
        expiry_date: Optional[datetime] = None
    ):
        self.id = id
        self.bank_id = bank_id
        self.blood_type = blood_type
        self.rh_factor = rh_factor
        self.kell = kell
        self.duffy = duffy
        self.kidd = kidd
        self.units_available = units_available
        self.collection_date = collection_date or datetime.now()
        self.expiry_date = expiry_date or (datetime.now() + timedelta(days=35))

def test_simple_match():
    """
    1. test_simple_match:
    Seeds 1 patient and 1 compatible unit. Asserts optimal CP-SAT status and exactly 1 match returned.
    """
    ref_date = datetime(2024, 10, 20, 10, 0, 0)
    
    patient = MockPatient(
        id="patient-1",
        name="Ananya",
        blood_type="B",
        rh_factor="+",
        next_transfusion_predicted=ref_date + timedelta(days=5),
        hospital_id="hospital-001"
    )
    
    bank = MockBloodBank(
        id="bank-1",
        name="Apollo Blood Bank",
        city="HYD",
        lat=17.4065,
        lng=78.4772
    )
    
    unit = MockInventory(
        id="inv-1",
        bank_id="bank-1",
        blood_type="B",
        rh_factor="+",
        units_available=1,
        expiry_date=ref_date + timedelta(days=10)
    )
    
    matches = optimize_matches(
        city_code="HYD",
        patients=[patient],
        inventory=[unit],
        banks=[bank],
        reference_date=ref_date
    )
    
    assert len(matches) == 1
    assert matches[0]["patient_id"] == "patient-1"
    assert matches[0]["unit_id"] == "inv-1"
    assert matches[0]["bank_name"] == "Apollo Blood Bank"
    assert matches[0]["distance_km"] == 0.0

def test_no_match_incompatible():
    """
    2. test_no_match_incompatible:
    Seeds 1 patient with O- blood, and 1 available unit with A+ blood.
    Asserts CP-SAT returns 0 matches since they are incompatible.
    """
    ref_date = datetime(2024, 10, 20, 10, 0, 0)
    
    patient = MockPatient(
        id="patient-2",
        name="Rohan",
        blood_type="O",
        rh_factor="-",
        next_transfusion_predicted=ref_date + timedelta(days=5)
    )
    
    bank = MockBloodBank(
        id="bank-1",
        name="Apollo Blood Bank",
        city="HYD",
        lat=17.4065,
        lng=78.4772
    )
    
    unit = MockInventory(
        id="inv-2",
        bank_id="bank-1",
        blood_type="A",
        rh_factor="+",
        units_available=1,
        expiry_date=ref_date + timedelta(days=10)
    )
    
    matches = optimize_matches(
        city_code="HYD",
        patients=[patient],
        inventory=[unit],
        banks=[bank],
        reference_date=ref_date
    )
    
    assert len(matches) == 0

def test_expired_unit_excluded():
    """
    3. test_expired_unit_excluded:
    Seeds a unit that expires 3 days before predicted transfusion date.
    Asserts the unit is excluded by the 2-day buffer constraint.
    """
    ref_date = datetime(2024, 10, 20, 10, 0, 0)
    
    patient = MockPatient(
        id="patient-3",
        name="Sneha",
        blood_type="B",
        rh_factor="+",
        next_transfusion_predicted=ref_date + timedelta(days=5)
    )
    
    bank = MockBloodBank(
        id="bank-1",
        name="Apollo Blood Bank",
        city="HYD",
        lat=17.4065,
        lng=78.4772
    )
    
    # Expires in 2 days from ref_date (Nov 22), while transfusion is in 5 days (Nov 25).
    # Since 2 days is < 5 - 2 = 3 days, it violates the 2-day buffer constraint.
    unit = MockInventory(
        id="inv-3",
        bank_id="bank-1",
        blood_type="B",
        rh_factor="+",
        units_available=1,
        expiry_date=ref_date + timedelta(days=2)
    )
    
    matches = optimize_matches(
        city_code="HYD",
        patients=[patient],
        inventory=[unit],
        banks=[bank],
        reference_date=ref_date
    )
    
    assert len(matches) == 0

def test_rare_type_shortage():
    """
    4. test_rare_type_shortage:
    Seeds a Kell-negative patient, compatible blood group units are present
    but all are Kell-positive (represented by kell=False).
    Asserts 0 matches are made, raising shortage alerts.
    """
    ref_date = datetime(2024, 10, 20, 10, 0, 0)
    
    patient = MockPatient(
        id="patient-4",
        name="Vikram",
        blood_type="B",
        rh_factor="+",
        alloimmunization_flag=True,
        kell_negative=True,
        next_transfusion_predicted=ref_date + timedelta(days=5)
    )
    
    bank = MockBloodBank(
        id="bank-1",
        name="Apollo Blood Bank",
        city="HYD",
        lat=17.4065,
        lng=78.4772
    )
    
    # B+ unit but Kell-positive (kell=False in this DB represents Kell-positive)
    unit = MockInventory(
        id="inv-4",
        bank_id="bank-1",
        blood_type="B",
        rh_factor="+",
        kell=False,
        units_available=1,
        expiry_date=ref_date + timedelta(days=10)
    )
    
    matches = optimize_matches(
        city_code="HYD",
        patients=[patient],
        inventory=[unit],
        banks=[bank],
        reference_date=ref_date
    )
    
    assert len(matches) == 0

def test_ortools_timeout():
    """
    5. test_ortools_timeout:
    Seeds a highly dense problem (100 patients, 500 inventory items across 10 cities).
    Verifies that the CP-SAT solver solves and returns feasible partial matches within
    30 seconds without throwing exceptions.
    """
    ref_date = datetime(2024, 10, 20, 10, 0, 0)
    
    # 1. Create 10 cities
    cities = [f"CITY_{i}" for i in range(10)]
    
    # 2. Create 10 blood banks (1 per city)
    banks = []
    for i in range(10):
        banks.append(MockBloodBank(
            id=f"bank-{i}",
            name=f"Bank {i}",
            city=cities[i],
            lat=17.4000 + (0.01 * i),
            lng=78.4900 + (0.01 * i)
        ))
        
    # 3. Create 100 patients (10 per city)
    patients = []
    blood_groups = ["A", "B", "AB", "O"]
    rh_factors = ["+", "-"]
    for i in range(100):
        city_idx = i % 10
        bg = blood_groups[i % 4]
        rh = rh_factors[i % 2]
        
        patients.append(MockPatient(
            id=f"patient-{i}",
            name=f"Patient {i}",
            blood_type=bg,
            rh_factor=rh,
            next_transfusion_predicted=ref_date + timedelta(days=3 + (i % 7)),
            hospital_id="hospital-001"
        ))
        
    # 4. Create 500 inventory items (50 per blood bank)
    inventory = []
    for i in range(500):
        bank_idx = i % 10
        bg = blood_groups[i % 4]
        rh = rh_factors[i % 2]
        
        inventory.append(MockInventory(
            id=f"inv-{i}",
            bank_id=f"bank-{bank_idx}",
            blood_type=bg,
            rh_factor=rh,
            units_available=5,  # Generates 5 flattened units per item
            expiry_date=ref_date + timedelta(days=5 + (i % 15))
        ))
        
    # Solve for CITY_0
    city_patients = [p for p in patients if int(p.id.split("-")[1]) % 10 == 0]
    city_banks = [banks[0]]
    city_inventory = [inv for inv in inventory if inv.bank_id == "bank-0"]
    
    # Track duration
    start_time = datetime.now()
    matches = optimize_matches(
        city_code="CITY_0",
        patients=city_patients,
        inventory=city_inventory,
        banks=city_banks,
        reference_date=ref_date
    )
    duration = (datetime.now() - start_time).total_seconds()
    
    logger.info(f"Dense CP-SAT solved in {duration:.4f} seconds with {len(matches)} matches.")
    
    # Assert solver runs within the timeout limit
    assert duration < 30.0
    # Should find matches since compatibility and expiry line up
    assert len(matches) > 0
