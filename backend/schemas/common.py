from typing import Generic, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class ApiError(BaseModel):
    """
    Standard error envelope for API failure responses.
    """
    code: str
    message: str

class ApiResponse(BaseModel, Generic[T]):
    """
    Standardized top-level response envelope for all RaktaSetu NOOR API endpoints.
    """
    success: bool
    data: Optional[T] = None
    error: Optional[ApiError] = None
