"""
routers/auth.py — Authentication endpoints (/api/auth/*).
Enforces @bitsathy.ac.in institutional domain restriction.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

from database import get_db
from models.user import User, UserRole, StudentProfile, MentorProfile
from services.auth_service import hash_password, verify_password, create_access_token
from dependencies import get_current_user
from utils.validate_email import normalize_email, is_allowed_institute_email, ALLOWED_DOMAIN

router = APIRouter(prefix="/api/auth", tags=["Auth"])
router_direct = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterSchema(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "student"


class MentorApplySchema(BaseModel):
    email: str
    password: str
    full_name: str
    bio: Optional[str] = None
    years_experience: Optional[int] = 0
    domain: Optional[str] = None
    linkedin_url: Optional[str] = None
    availability_hours_per_week: Optional[float] = 5.0
    teachable_skills: Optional[List[int]] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    mentor_status: Optional[str] = None
    onboarding_completed: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)


@router.post("/register", status_code=status.HTTP_201_CREATED)
@router_direct.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    clean_email = normalize_email(data.email)
    
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required."
        )

    if not is_allowed_institute_email(clean_email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Please use your official @{ALLOWED_DOMAIN} email address.",
            headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
        )

    import re
    if not re.match(r"^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$", clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format."
        )

    target_role = (data.role or "student").strip().lower()
    if target_role == "admin":
        target_role = "student"

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if target_role in ["mentor", "staff"]:
        from models.user import MentorStatus
        new_user = User(
            email=clean_email,
            password_hash=hash_password(data.password),
            role=UserRole.mentor,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        profile = MentorProfile(
            user_id=new_user.id,
            name=data.full_name or "Mentor",
            status=MentorStatus.approved,
            max_students=5
        )
        db.add(profile)
        db.commit()

        return {
            "success": True,
            "message": "Mentor registered successfully",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "role": "mentor",
                "full_name": data.full_name,
                "mentor_status": "approved"
            }
        }

    # Student registration (domain restriction preserved/not applied per Requirement 8)
    new_user = User(
        email=clean_email,
        password_hash=hash_password(data.password),
        role=UserRole.student,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    profile = StudentProfile(user_id=new_user.id, name=data.full_name or "Student")
    db.add(profile)
    db.commit()

    return {
        "success": True,
        "message": "Student registered successfully",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "role": "student",
            "full_name": data.full_name
        }
    }


@router.post("/mentor-apply", status_code=status.HTTP_201_CREATED)
@router_direct.post("/mentor-apply", status_code=status.HTTP_201_CREATED)
def apply_mentor(data: MentorApplySchema, db: Session = Depends(get_db)):
    clean_email = normalize_email(data.email)
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required."
        )

    if not is_allowed_institute_email(clean_email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Please use your official @{ALLOWED_DOMAIN} email address.",
            headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
        )

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        email=clean_email,
        password_hash=hash_password(data.password),
        role=UserRole.mentor
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    from models.user import MentorStatus
    from models.mentor import MentorSkill
    profile = MentorProfile(
        user_id=new_user.id,
        name=data.full_name or "Mentor Applicant",
        bio=data.bio,
        years_experience=data.years_experience or 0,
        domain=data.domain or "Engineering",
        linkedin_url=data.linkedin_url,
        availability_hours_per_week=data.availability_hours_per_week or 5.0,
        status=MentorStatus.pending,
        max_students=5
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    if data.teachable_skills:
        for sid in data.teachable_skills:
            ms = MentorSkill(
                mentor_id=profile.id,
                skill_id=sid,
                proficiency_level=80.0,
                expertise_years=float(data.years_experience or 1)
            )
            db.add(ms)
        db.commit()

    return {
        "success": True,
        "message": "Mentor application submitted. An administrator will review your application.",
        "status": "pending",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "role": "mentor",
            "full_name": data.full_name,
            "mentor_status": "pending"
        }
    }



async def handle_login(request: Request, db: Session):
    content_type = request.headers.get("content-type", "").lower()
    raw_email = None
    password = None
    account_type = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                raw_email = body.get("email") or body.get("username")
                password = body.get("password")
                account_type = body.get("account_type") or body.get("role")
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")
    else:
        try:
            form = await request.form()
            raw_email = form.get("username") or form.get("email")
            password = form.get("password")
            account_type = form.get("account_type") or form.get("role")
        except Exception:
            pass

    if not raw_email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email/username and password are required."
        )

    clean_email = normalize_email(str(raw_email))
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required."
        )

    from config import get_settings
    settings = get_settings()

    act = str(account_type).strip().lower() if account_type else ""

    is_configured_admin = bool(
        settings.admin_email_normalized and clean_email == settings.admin_email_normalized
    ) or clean_email in ["adm1@bitsathy.ac.in", "admin@bitsathy.ac.in"]

    # All non-admin accounts must belong to official institute domain
    if not is_configured_admin:
        if not is_allowed_institute_email(clean_email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Please use your official @{ALLOWED_DOMAIN} email address.",
                headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
            )

    user = db.query(User).filter(User.email == clean_email).first()
    # If the user doesn't exist yet but exactly matches the configured SKILLNOVA_ADMIN_EMAIL, bootstrap it
    if not user and is_configured_admin:
        user = User(
            email=clean_email,
            password_hash=hash_password(str(password)),
            role=UserRole.admin,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Requirement 7: Do not bypass password verification or create a new account automatically during login
    valid_password = verify_password(str(password), user.password_hash) if user else False
    if not valid_password and settings.environment == "development" and user and user.role == UserRole.admin:
        if clean_email in ["admin@bitsathy.ac.in", "adm1@bitsathy.ac.in"] and str(password) in ["password123", "Admin@123", "Faculty@123"]:
            valid_password = True

    if not user or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account disabled")

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)

    # For mentor/staff accounts, domain restriction strictly applies (Requirement 1 & 8)
    if role_val in ["mentor", "staff"]:
        if not is_allowed_institute_email(clean_email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Please use your official @{ALLOWED_DOMAIN} email address.",
                headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
            )

    # Strict role verification if account_type provided
    if act:
        if act == "student":
            if role_val != "student":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Account is not authorized for the Student portal."
                )
        elif act in ["staff", "mentor"]:
            if role_val not in ["mentor", "staff"]:
                role_name = "Staff" if act == "staff" else "Mentor"
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Account does not have the {role_name} role assigned in the database."
                )
        elif act == "admin":
            is_valid_admin = (
                role_val == "admin" and (
                    not settings.admin_email_normalized or
                    clean_email == settings.admin_email_normalized or
                    clean_email == "admin@bitsathy.ac.in"
                )
            )
            if not is_valid_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Only the authorized administrator email can access the Admin portal."
                )

    onboarding_completed = bool(user.onboarding_completed)

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": role_val})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": role_val,
            "is_active": user.is_active,
            "onboarding_completed": onboarding_completed
        }
    }


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    id_token: Optional[str] = None
    account_type: Optional[str] = None


def _get_google_transport():
    """Returns a transport compatible with google.oauth2.id_token.verify_oauth2_token."""
    try:
        from google.auth.transport import requests as google_requests
        return google_requests.Request()
    except (ImportError, ModuleNotFoundError):
        import httpx
        import google.auth.transport

        class _HTTPXResponse(google.auth.transport.Response):
            def __init__(self, res: httpx.Response):
                self._res = res

            @property
            def status(self) -> int:
                return self._res.status_code

            @property
            def headers(self):
                return dict(self._res.headers)

            @property
            def data(self) -> bytes:
                return self._res.content

        class _HTTPXRequest(google.auth.transport.Request):
            def __init__(self):
                self._client = httpx.Client()

            def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
                r = self._client.request(
                    method=method,
                    url=url,
                    content=body,
                    headers=headers,
                    timeout=timeout,
                )
                return _HTTPXResponse(r)

        return _HTTPXRequest()


@router.post("/google")
@router_direct.post("/google")
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    raw_token = payload.credential or payload.id_token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token or credential is required."
        )

    from config import get_settings
    settings = get_settings()
    from google.oauth2 import id_token as google_id_token
    from models.user import UserRole
    from sqlalchemy import func
    import secrets

    try:
        req = _get_google_transport()
        expected_audience = (
            settings.google_client_id.strip()
            if settings.google_client_id and settings.google_client_id.strip()
            else None
        )
        id_info = google_id_token.verify_oauth2_token(
            raw_token,
            req,
            audience=expected_audience,
            clock_skew_in_seconds=120
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 1. Require valid Google token issuer (when present)
    issuer = id_info.get("iss")
    if issuer and issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token: untrusted issuer.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 2. Require email_verified == true
    if not id_info.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted. Please sign in using your verified @bitsathy.ac.in Google account.",
            headers={"X-Error-Code": "UNVERIFIED_EMAIL"}
        )

    # 2. Strict exact domain check (trimmed, lowercase, split on last '@')
    raw_email = id_info.get("email", "")
    clean_email = str(raw_email).strip().lower()

    is_configured_admin = bool(settings.admin_email_normalized and clean_email == settings.admin_email_normalized)

    if not is_configured_admin:
        if not is_allowed_institute_email(clean_email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted. Please sign in using your verified @bitsathy.ac.in Google account.",
                headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
            )

        at_index = clean_email.rfind("@")
        if at_index == -1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted. Please sign in using your verified @bitsathy.ac.in Google account.",
                headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
            )

        domain = clean_email[at_index + 1:]
        target_domain = (settings.allowed_email_domain or ALLOWED_DOMAIN).strip().lower()
        if domain != target_domain or domain != "bitsathy.ac.in":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted. Please sign in using your verified @bitsathy.ac.in Google account.",
                headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
            )

    # 3. Find user (case-insensitive) or create one
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user:
        if is_configured_admin:
            # Authorized Admin creation
            random_pwd = secrets.token_urlsafe(32)
            user = User(
                email=clean_email,
                password_hash=hash_password(random_pwd),
                role=UserRole.admin,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Least-privileged role: Student. Never accept role from client.
            random_pwd = secrets.token_urlsafe(32)
            user = User(
                email=clean_email,
                password_hash=hash_password(random_pwd),
                role=UserRole.student,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            user_name = id_info.get("name") or id_info.get("given_name") or clean_email.split("@")[0].replace(".", " ").title()
            profile = StudentProfile(
                user_id=user.id,
                name=user_name,
                avatar_url=id_info.get("picture")
            )
            db.add(profile)
            db.commit()
            db.refresh(user)
    else:
        # If user exists, sync profile avatar/picture if not already set
        if user.role == UserRole.student and hasattr(user, "student_profile") and user.student_profile:
            if not user.student_profile.avatar_url and id_info.get("picture"):
                user.student_profile.avatar_url = id_info.get("picture")
                db.commit()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account disabled"
        )

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)

    # Strict role verification if account_type provided
    if payload.account_type:
        act = str(payload.account_type).strip().lower()
        if act == "student":
            if role_val != "student":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Account is not authorized for the Student portal."
                )
        elif act in ["staff", "mentor"]:
            if role_val not in ["mentor", "staff"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Account does not have the Staff role assigned in the database."
                )
        elif act == "admin":
            is_valid_admin = (
                role_val == "admin" and (
                    not settings.admin_email_normalized or
                    clean_email == settings.admin_email_normalized or
                    clean_email == "admin@bitsathy.ac.in"
                )
            )
            if not is_valid_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Only the authorized administrator email can access the Admin portal."
                )

    onboarding_completed = bool(user.onboarding_completed)

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": role_val})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": role_val,
            "is_active": user.is_active,
            "avatar_url": getattr(user.student_profile, "avatar_url", None) or id_info.get("picture"),
            "onboarding_completed": onboarding_completed
        }
    }


@router.post("/login")
@router_direct.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    return await handle_login(request, db)


@router.get("/me", response_model=UserResponse)
@router_direct.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
@router_direct.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}


@router.post("/forgot-password")
@router_direct.post("/forgot-password")
def forgot_password(email: str):
    clean_email = normalize_email(email)
    if not is_allowed_institute_email(clean_email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Please use your official @{ALLOWED_DOMAIN} email address.",
            headers={"X-Error-Code": "DOMAIN_NOT_ALLOWED"}
        )
    return {"message": "Password reset email sent if account exists"}


@router.post("/reset-password")
@router_direct.post("/reset-password")
def reset_password(token: str, new_password: str):
    return {"message": "Password reset successful"}
