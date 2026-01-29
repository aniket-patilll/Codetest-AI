"""
Dependency injection for FastAPI.
Provides Supabase client and current user extraction.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

from app.config import get_settings, Settings
from app.auth.jwt import verify_supabase_jwt


security = HTTPBearer()


def get_supabase_client(
    settings: Annotated[Settings, Depends(get_settings)]
) -> Client:
    """Get Supabase client instance."""
    return create_client(settings.supabase_url, settings.supabase_key)


def get_supabase_admin_client(
    settings: Annotated[Settings, Depends(get_settings)]
) -> Client:
    """Get Supabase client with service role for admin operations."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    settings: Annotated[Settings, Depends(get_settings)]
) -> dict:
    """
    Extract and verify current user from JWT token.
    Returns the decoded token payload with user info.
    """
    token = credentials.credentials
    
    try:
        payload = verify_supabase_jwt(token, settings.supabase_jwt_secret, settings.supabase_url)
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_id(
    current_user: Annotated[dict, Depends(get_current_user)]
) -> str:
    """Extract user ID from current user payload."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )
    return user_id


class RoleChecker:
    """Dependency class to check user roles."""
    
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self,
        current_user: Annotated[dict, Depends(get_current_user)],
        supabase: Annotated[Client, Depends(get_supabase_client)]
    ) -> dict:
        """Check if user has required role."""
        user_id = current_user.get("sub")
        
        # Fetch user role from database
        result = supabase.table("users").select("role").eq("id", user_id).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_role = result.data.get("role")
        
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' not authorized. Required: {self.allowed_roles}"
            )
        
        return {**current_user, "role": user_role}


# Pre-configured role checkers
require_host = RoleChecker(["host"])
require_student = RoleChecker(["student"])
require_any_role = RoleChecker(["host", "student"])
