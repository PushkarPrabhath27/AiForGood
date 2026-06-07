from __future__ import annotations
from typing import Optional
class RaktaSetuException(Exception):
    """Base class for all domain-specific exceptions in RaktaSetu NOOR."""
    status_code: int = 500
    detail: str = "An unexpected error occurred in the system."

    def __init__(self, detail: Optional[str] = None) -> None:
        if detail:
            self.detail = detail
        super().__init__(self.detail)


class PatientNotFoundError(RaktaSetuException):
    """Raised when a patient cannot be found in the database by their unique identifier."""
    status_code: int = 404
    detail: str = "The specified patient could not be found."


class BloodBankNotFoundError(RaktaSetuException):
    """Raised when a localized blood bank cannot be found in the database."""
    status_code: int = 404
    detail: str = "The specified blood bank could not be found."


class InventoryNotFoundError(RaktaSetuException):
    """Raised when a specific blood unit inventory item cannot be found in the database."""
    status_code: int = 404
    detail: str = "The specified inventory item could not be found."


class InsufficientDataError(RaktaSetuException):
    """Raised when clinical operations (e.g., forecasting) cannot execute due to lack of readings."""
    status_code: int = 422
    detail: str = "Insufficient hemoglobin readings exist to perform a clinical forecast."


class ForecastError(RaktaSetuException):
    """Raised when the Prophet ML forecasting engine fails to compile or converge."""
    status_code: int = 500
    detail: str = "The forecasting engine encountered a critical modeling error."


class GuardianCircleError(RaktaSetuException):
    """Raised when a patient's guardian circle is invalid, incomplete, or fails to mobilize."""
    status_code: int = 422
    detail: str = "The guardian circle cannot be constructed or mobilized due to configuration errors."


class InventoryMatchError(RaktaSetuException):
    """Raised when city-wide inventory matching optimization fails to solve or times out."""
    status_code: int = 422
    detail: str = "Combinatorial optimization matching failed to compute valid solutions."


class MessagingError(RaktaSetuException):
    """Raised when third-party communication APIs (Twilio, Claude) fail to execute or time out."""
    status_code: int = 503
    detail: str = "The notification or messaging delivery pipeline was temporarily unavailable."
