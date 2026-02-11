"""
Integrity signals API router.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import (
    get_current_user,
    get_supabase_client,
    require_host,
)
from app.schemas.integrity import (
    IntegrityEventRequest,
    IntegrityEventResponse,
    IntegritySummary,
    IntegrityListItem,
)
from app.services.risk_calculator import (
    calculate_risk_level,
    aggregate_events_to_counts,
)


router = APIRouter()


@router.post("/integrity", response_model=IntegrityEventResponse)
async def record_integrity_event(
    request: IntegrityEventRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Record an integrity event from the frontend.
    
    Events include: tab_switch, copy_paste, paste, window_blur, right_click
    """
    # Verify participant exists and belongs to current user
    user_id = current_user.get("sub")
    
    participant_result = supabase.table("participants").select("user_id").eq("id", request.participant_id).single().execute()
    
    if not participant_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    if participant_result.data["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only record events for yourself"
        )
    
    # Insert event
    event_data = {
        "participant_id": request.participant_id,
        "event_type": request.event_type,
        "metadata": request.metadata
    }
    
    insert_result = supabase.table("integrity_events").insert(event_data).execute()
    
    if not insert_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record event"
        )
    
    return IntegrityEventResponse(
        recorded=True,
        event_id=insert_result.data[0]["id"]
    )


@router.get("/integrity/summary/{participant_id}", response_model=IntegritySummary)
async def get_integrity_summary(
    participant_id: str,
    current_user: Annotated[dict, Depends(require_host)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Get integrity summary for a participant (host only).
    
    Returns event counts and risk level assessment.
    """
    # Get participant with user info
    participant_result = supabase.table("participants").select(
        "*, users(full_name)"
    ).eq("id", participant_id).single().execute()
    
    if not participant_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )
    
    participant = participant_result.data
    student_name = participant.get("users", {}).get("full_name", "Unknown")
    
    # Get all integrity events for this participant
    events_result = supabase.table("integrity_events").select("*").eq("participant_id", participant_id).execute()
    
    events = events_result.data or []
    
    # Aggregate events
    event_counts = aggregate_events_to_counts(events)
    
    # Calculate risk level
    risk_level, risk_factors = calculate_risk_level(event_counts)
    
    return IntegritySummary(
        participant_id=participant_id,
        student_name=student_name,
        events=event_counts,
        risk_level=risk_level,
        risk_factors=risk_factors
    )


@router.get("/integrity/test/{test_id}", response_model=list[IntegrityListItem])
async def get_test_integrity(
    test_id: str,
    current_user: Annotated[dict, Depends(require_host)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Get integrity signals for all participants in a test (host only).
    """
    # Verify host owns this test
    test_result = supabase.table("tests").select("host_id").eq("id", test_id).single().execute()
    
    if not test_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found"
        )
    
    if test_result.data["host_id"] != current_user.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this test"
        )
    
    # Get all participants with their events
    participants_result = supabase.table("participants").select(
        "id, user_id, users(full_name)"
    ).eq("test_id", test_id).execute()
    
    items = []
    
    for participant in participants_result.data or []:
        participant_id = participant["id"]
        
        # Get events for this participant
        events_result = supabase.table("integrity_events").select("*").eq("participant_id", participant_id).execute()
        
        events = events_result.data or []
        event_counts = aggregate_events_to_counts(events)
        risk_level, _ = calculate_risk_level(event_counts)
        
        items.append(IntegrityListItem(
            student_id=participant["user_id"],
            student_name=participant.get("users", {}).get("full_name", "Unknown"),
            tab_switches=event_counts.tab_switches,
            copy_paste_attempts=event_counts.copy_paste_attempts + event_counts.paste_attempts,
            submission_timing_anomaly=False,  # Would need more context
            risk_level=risk_level
        ))
    
    # Sort by risk level (high first)
    risk_order = {"high": 0, "medium": 1, "low": 2}
    items.sort(key=lambda x: risk_order.get(x.risk_level, 2))
    
    return items
