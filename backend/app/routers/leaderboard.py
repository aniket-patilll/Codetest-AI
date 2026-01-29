"""
Leaderboard API router.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

from app.dependencies import get_current_user, get_supabase_client
from app.schemas.leaderboard import (
    LeaderboardEntry,
    LeaderboardResponse,
)


router = APIRouter()


@router.get("/leaderboard/{test_id}", response_model=LeaderboardResponse)
async def get_leaderboard(
    test_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)],
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """
    Get leaderboard for a test.
    
    Ranking logic:
    1. Primary: Total score (descending)
    2. Tiebreaker: Time taken (ascending)
    3. Secondary: Submission time (ascending)
    """
    # Verify test exists
    test_result = supabase.table("tests").select("id, name").eq("id", test_id).single().execute()
    
    if not test_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found"
        )
    
    # Get participants with their submissions
    # Using raw query via leaderboard view for proper aggregation
    leaderboard_result = supabase.table("leaderboard").select("*").eq("test_id", test_id).order("rank").range(offset, offset + limit - 1).execute()
    
    entries = []
    for row in leaderboard_result.data or []:
        # Format time taken
        time_taken = row.get("time_taken")
        if time_taken:
            # Handle PostgreSQL interval format
            if isinstance(time_taken, dict) and 'microseconds' in time_taken:
                # PostgreSQL interval as dict
                total_microseconds = time_taken.get('microseconds', 0)
                total_seconds = total_microseconds / 1_000_000
            elif hasattr(time_taken, 'total_seconds'):
                # Python timedelta object
                total_seconds = time_taken.total_seconds()
            elif isinstance(time_taken, (int, float)):
                # Direct seconds value
                total_seconds = float(time_taken)
            else:
                # String format or unknown type
                try:
                    # Try to parse string format "HH:MM:SS" or "DD days, HH:MM:SS"
                    if isinstance(time_taken, str):
                        # Handle various interval string formats
                        import re
                        # Extract numeric values from interval string
                        numbers = re.findall(r'(-?\d+)', time_taken)
                        if len(numbers) >= 3:
                            # Assume format is days, hours, minutes
                            days, hours, minutes = map(int, numbers[:3])
                            total_seconds = days * 86400 + hours * 3600 + minutes * 60
                        elif len(numbers) >= 2:
                            # Assume format is hours, minutes
                            hours, minutes = map(int, numbers[:2])
                            total_seconds = hours * 3600 + minutes * 60
                        else:
                            total_seconds = 0
                    else:
                        total_seconds = 0
                except:
                    total_seconds = 0
            
            hours, remainder = divmod(int(total_seconds), 3600)
            minutes, seconds = divmod(remainder, 60)
            time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        else:
            time_str = "00:00:00"
        
        entries.append(LeaderboardEntry(
            rank=row["rank"],
            student_name=row["student_name"],
            user_id=row["user_id"],
            total_score=row["total_score"] or 0,
            testcases_passed=row["total_testcases_passed"] or 0,
            total_testcases=row["total_testcases"] or 0,
            time_taken=time_str,
            submitted_at=row.get("submitted_at")
        ))
    
    # Get total count
    count_result = supabase.table("leaderboard").select("*", count="exact").eq("test_id", test_id).execute()
    total = count_result.count or len(entries)
    
    return LeaderboardResponse(
        test_id=test_id,
        entries=entries,
        total_participants=total
    )


@router.get("/leaderboard/{test_id}/my-rank")
async def get_my_rank(
    test_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Get current user's rank in a test leaderboard.
    """
    user_id = current_user.get("sub")
    
    # Find user in leaderboard
    result = supabase.table("leaderboard").select("*").eq("test_id", test_id).eq("user_id", user_id).single().execute()
    
    if not result.data:
        return {
            "ranked": False,
            "message": "You have not submitted any solutions yet"
        }
    
    row = result.data
    
    time_taken = row.get("time_taken")
    if time_taken:
        # Handle PostgreSQL interval format
        if isinstance(time_taken, dict) and 'microseconds' in time_taken:
            # PostgreSQL interval as dict
            total_microseconds = time_taken.get('microseconds', 0)
            total_seconds = total_microseconds / 1_000_000
        elif hasattr(time_taken, 'total_seconds'):
            # Python timedelta object
            total_seconds = time_taken.total_seconds()
        elif isinstance(time_taken, (int, float)):
            # Direct seconds value
            total_seconds = float(time_taken)
        else:
            # String format or unknown type
            try:
                # Try to parse string format "HH:MM:SS" or "DD days, HH:MM:SS"
                if isinstance(time_taken, str):
                    # Handle various interval string formats
                    import re
                    # Extract numeric values from interval string
                    numbers = re.findall(r'(-?\d+)', time_taken)
                    if len(numbers) >= 3:
                        # Assume format is days, hours, minutes
                        days, hours, minutes = map(int, numbers[:3])
                        total_seconds = days * 86400 + hours * 3600 + minutes * 60
                    elif len(numbers) >= 2:
                        # Assume format is hours, minutes
                        hours, minutes = map(int, numbers[:2])
                        total_seconds = hours * 3600 + minutes * 60
                    else:
                        total_seconds = 0
                else:
                    total_seconds = 0
            except:
                total_seconds = 0
        
        hours, remainder = divmod(int(total_seconds), 3600)
        minutes, seconds = divmod(remainder, 60)
        time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        time_str = "00:00:00"
    
    return {
        "ranked": True,
        "rank": row["rank"],
        "total_score": row["total_score"] or 0,
        "testcases_passed": row["total_testcases_passed"] or 0,
        "total_testcases": row["total_testcases"] or 0,
        "time_taken": time_str
    }
