"""
Pydantic schemas for leaderboard.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class LeaderboardEntry(BaseModel):
    """Single leaderboard entry."""
    rank: int
    student_name: str
    user_id: str
    total_score: float
    testcases_passed: int
    total_testcases: int
    time_taken: str  # formatted as "HH:MM:SS"
    submitted_at: Optional[datetime] = None


class LeaderboardResponse(BaseModel):
    """Response model for leaderboard."""
    test_id: str
    entries: list[LeaderboardEntry]
    total_participants: int


class LeaderboardFilters(BaseModel):
    """Query parameters for leaderboard filtering."""
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
