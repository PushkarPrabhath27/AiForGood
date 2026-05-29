from __future__ import annotations
from typing import Optional, Dict
from pydantic import BaseModel, Field

class NotifyAlertResponse(BaseModel):
    """
    Schema for the response of an alert notification dispatch attempt.
    """
    delivery_status: str = Field(..., description="Delivery status of the alert (e.g. sent, mock_sent, cached)")
    recipient_phone: str = Field(..., description="Masked or unmasked recipient phone number")
    message_body: str = Field(..., description="Final message body dispatched to the recipient")

class ChatbotMessageRequest(BaseModel):
    """
    Schema for incoming messages sent to the Saathi virtual coordinator assistant.
    """
    message: str = Field(..., description="Message string inputted by the user or donor")
    patient_id: Optional[str] = Field(None, description="Optional unique identifier of the patient context")
    guardian_id: Optional[str] = Field(None, description="Optional unique identifier of the guardian context")
    language: str = Field("en", description="Preferred language for the response (e.g. en, te)")

class ChatbotMessageResponse(BaseModel):
    """
    Schema for the chatbot response containing the virtual assistant's reply and clinical context.
    """
    reply: str = Field(..., description="Empathetic reply message from Saathi assistant")
    context_retrieved: Dict[str, str] = Field(
        default_factory=dict,
        description="Key-value dictionary showing metadata or clinical database records queried to form the answer"
    )
