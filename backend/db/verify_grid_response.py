import urllib.request
import json

def test_grid_api():
    try:
        url = "http://127.0.0.1:8000/api/v1/grid/city/HYD"
        print(f"Requesting {url}...")
        req = urllib.request.urlopen(url)
        res_data = req.read().decode('utf-8')
        res_json = json.loads(res_data)
        
        print("Response successful!")
        print(f"Success: {res_json.get('success')}")
        data = res_json.get('data', {})
        print(f"City Code: {data.get('city_code')}")
        print(f"City Health Score: {data.get('city_health_score')}")
        print(f"Health Status: {data.get('health_status')}")
        
        banks = data.get('blood_banks', [])
        print(f"Total Banks returned: {len(banks)}")
        for idx, b in enumerate(banks[:3]):
            print(f"Bank {idx+1}: {b.get('name')} (Status: {b.get('status')})")
            print(f"  Inventory Summary: {b.get('inventory_summary')}")
            print(f"  Is Stale: {b.get('is_stale')}")
            
        matches = data.get('active_matches', [])
        print(f"Total Matches: {len(matches)}")
        for idx, m in enumerate(matches[:3]):
            print(f"Match {idx+1}: Patient {m.get('patient_name')} -> Bank {m.get('bank_name')} ({m.get('blood_group')}), Units: {m.get('units_available')}")
            
    except Exception as e:
        print(f"Error calling grid API: {str(e)}")

if __name__ == '__main__':
    test_grid_api()
