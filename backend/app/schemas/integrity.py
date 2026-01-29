"""
Pydantic schemas for integrity signals.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Literal


EventType = Literal["tab_switch", "copy_paste", "paste", "window_blur", "right_click"]
RiskLevel = Literal["low", "medium", "high"]


class IntegrityEventRequest(BaseModel):
    """Request model for recording an integrity event."""
    participant_id: str = Field(..., description="UUID of the participant")
    event_type: EventType = Field(..., description="Type of integrity event")
    metadata: dict = Field(default_factory=dict, description="Additional event metadata")


class IntegrityEventResponse(BaseModel):
    """Response model for recorded event."""
    recorded: bool
    event_id: str


class EventCounts(BaseModel):
    """Count of different event types."""
    tab_switches: int = 0
    copy_paste_attempts: int = 0
    paste_attempts: int = 0
    window_blur_count: int = 0
    right_clicks: int = 0


class IntegritySummary(BaseModel):
    """Integrity summary for a participant."""
    participant_id: str
    student_name: str
    events: EventCounts
    risk_level: RiskLevel
    risk_factors: list[str] = Field(default_factory=list)


class IntegrityListItem(BaseModel):
    """Integrity item for list views."""
    student_id: str
    student_name: str
    tab_switches: int
    copy_paste_attempts: int
    submission_timing_anomaly: bool
    risk_level: RiskLevel
