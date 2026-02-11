"""
Authentication middleware for FastAPI routes.
Provides decorators and dependency functions for protecting endpoints.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from typing import Optional, Dict, Any
from jose import JWTError

from app.auth.jwt import verify_supabase_jwt
from app.config import get_settings

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token.
    Verifies the Supabase JWT token and returns the user payload.
    """
    try:
        settings = get_settings()
        payload = verify_supabase_jwt(
            credentials.credentials, 
            settings.supabase_jwt_secret,
            settings.supabase_url
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

def get_current_user_id(current_user: Dict = Depends(get_current_user)) -> str:
    """
    Extract user ID from the authenticated user payload.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID not found in token"
        )
    return user_id

def require_role(required_role: str):
    """
    Factory function that creates a dependency to check user role.
    """
    def role_checker(current_user: Dict = Depends(get_current_user)) -> Dict[str, Any]:
        # Extract role from user metadata
        user_metadata = current_user.get("user_metadata", {})
        user_role = user_metadata.get("role", "student")  # Default to student
        
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}, Your role: {user_role}"
            )
        
        # Add role to user object for convenience
        current_user["role"] = user_role
        return current_user
    
    return role_checker

# Convenience role-specific dependencies
require_host = require_role("host")
require_student = require_role("student")

async def refresh_user_session(token: str) -> Optional[Dict[str, Any]]:
    """
    Refresh user session with Supabase.
    Useful for extending session lifetime or handling expired tokens.
    """
    try:
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.supabase_url}/auth/v1/token?grant_type=refresh_token",
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={"refresh_token": token}
            )
            
            if response.status_code == 200:
                return response.json()
            return None
            
    except Exception as e:
        print(f"Session refresh error: {e}")
        return None

def validate_session_middleware(request):
    """
    Middleware function to validate session on each request.
    Can be used in FastAPI middleware for automatic session validation.
    """
    # This would typically be implemented as FastAPI middleware
    # that checks token validity and refreshes if needed
    pass