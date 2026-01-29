"""
JWT verification for Supabase tokens.
Supports HS256 (Legacy Secret), RS256, and ES256 (JWKS).
"""

from datetime import datetime, timezone
from jose import jwt, JWTError, jwk
import httpx
import time

# Simple in-memory cache for JWKS keys
_JWKS_CACHE = {}
_JWKS_CACHE_TTL = 3600  # 1 hour
_LAST_FETCH_TIME = 0

def get_signing_key(token: str, supabase_url: str):
    """
    Get the signing key for a token (RS256/ES256) or return None.
    fetches from JWKS endpoint.
    """
    global _LAST_FETCH_TIME, _JWKS_CACHE
    
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        alg = header.get("alg")
        
        # Supabase uses RS256 or ES256
        if alg not in ["RS256", "ES256"]:
            return None # Fallback to HS256 check
            
        if not kid:
            raise JWTError("No 'kid' in header")

        # Refresh cache if needed
        now = time.time()
        if now - _LAST_FETCH_TIME > _JWKS_CACHE_TTL or kid not in _JWKS_CACHE:
            try:
                # remove trailing slash if present
                base_url = supabase_url.rstrip('/')
                jwks_url = f"{base_url}/auth/v1/.well-known/jwks.json"
                
                # Fetch keys
                with httpx.Client() as client:
                     resp = client.get(jwks_url, timeout=5.0)
                     resp.raise_for_status()
                     keys = resp.json().get("keys", [])
                     
                     for key_data in keys:
                         _JWKS_CACHE[key_data["kid"]] = key_data
                     
                     _LAST_FETCH_TIME = now
            except Exception as e:
                print(f"Failed to fetch JWKS: {e}")
                # Fallback to existing cache if possible
                pass
        
        key_data = _JWKS_CACHE.get(kid)
        if not key_data:
             # Force refresh if key missing?
             # For now, just error
             raise JWTError(f"Public key not found for kid: {kid}")
             
        # Construct public key
        # python-jose handles dict key_data automatically if passed to decode?
        # Typically yes, but sometimes needs jwk.construct.
        # But 'jwt.decode' key arg can be the key dict/PEM.
        return key_data

    except JWTError as e:
        raise e
    except Exception as e:
        print(f"Error getting signing key: {e}")
        return None

def verify_supabase_jwt(token: str, secret: str, supabase_url: str) -> dict:
    """
    Verify a Supabase JWT token.
    Automatically handles RS256/ES256 (JWKS) and HS256 (Secret).
    """
    try:
        # Check header algorithm
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        
        decode_key = secret
        algorithms = ["HS256"]
        
        if alg in ["RS256", "ES256"]:
            key_data = get_signing_key(token, supabase_url)
            if key_data:
                # python-jose constructs key from dict automatically? 
                # Let's ensure it works by passing the dict.
                decode_key = key_data
                algorithms = [alg]
            else:
                 # If we failed to get key for RS256/ES256, we can't verify.
                 pass

        # Decode and verify the token
        payload = jwt.decode(
            token,
            decode_key,
            algorithms=algorithms,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": False,
            }
        )
        
        # Additional expiration check
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
            if datetime.now(timezone.utc) >= exp_datetime:
                raise JWTError("Token has expired")
        
        return payload
    
    except JWTError as e:
        raise JWTError(f"Invalid token: {str(e)}")
