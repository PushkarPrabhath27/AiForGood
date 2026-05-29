from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def health_check():
    """
    Returns standard 200 response mapping system availability status.
    
    Returns:
        dict: Standard health envelope {"status": "ok", "version": "1.0.0"}
    """
    return {"status": "ok", "version": "1.0.0"}
