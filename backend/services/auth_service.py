"""
services/auth_service.py — JWT creation, password hashing, and token verification.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import get_settings
from database import get_db
from models.user import User, UserRole

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class HTTPBearer401(HTTPBearer):
    def __init__(self, auto_error: bool = False):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> HTTPAuthorizationCredentials:
        credentials = await super().__call__(request)
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return credentials


security = HTTPBearer401()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict | int, role: Optional[str] = None) -> str:
    if isinstance(data, dict):
        to_encode = data.copy()
    else:
        to_encode = {"sub": str(data), "role": role or "student"}
    expire = datetime.now(timezone.utc) + timedelta(days=settings.access_token_expire_days)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, settings.effective_jwt_secret, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.effective_jwt_secret, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


verify_token = decode_token



def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    from utils.validate_email import normalize_email, is_allowed_institute_email
    payload = decode_token(credentials.credentials)
    sub = payload.get("sub", 0)
    user = None
    try:
        user_id = int(sub)
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    except (ValueError, TypeError):
        user = db.query(User).filter(User.email == str(sub), User.is_active == True).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    clean_email = normalize_email(user.email)
    token_email = normalize_email(payload.get("email", ""))

    user_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    is_valid_admin = bool(
        user_role == "admin" and (
            (settings.admin_email_normalized and clean_email == settings.admin_email_normalized) or
            clean_email in ["adm1@bitsathy.ac.in", "admin@bitsathy.ac.in"]
        )
    )

    if not is_valid_admin:
        if not is_allowed_institute_email(clean_email) or (token_email and not is_allowed_institute_email(token_email)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted. Please sign in using your verified @bitsathy.ac.in Google account.",
            )
    return user


def require_role(*roles: UserRole):
    """Dependency factory that enforces role-based access."""
    expanded_roles = set(roles)
    if UserRole.mentor in roles or any(r.value == "mentor" for r in roles):
        expanded_roles.add(UserRole.staff)
    if UserRole.staff in roles or any(r.value == "staff" for r in roles):
        expanded_roles.add(UserRole.mentor)

    def _check(current_user: User = Depends(get_current_user)):
        user_role = current_user.role
        if user_role not in expanded_roles and getattr(user_role, "value", str(user_role)) not in [r.value for r in expanded_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return _check


def get_student_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the StudentProfile for the current user; 404 if not found."""
    from models.user import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return profile
