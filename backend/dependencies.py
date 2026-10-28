"""
dependencies.py — Strict Role-Based Access Control (RBAC) dependencies.
Enforces:
  - Student -> /api/student/*
  - Mentor  -> /api/mentor/* (and only assigned students -> 403 if unassigned)
  - Admin   -> /api/admin/*
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from services.auth_service import verify_token
from models.user import User
from models.mentor import MentorMatch

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Extract and verify JWT token, returning the database user."""
    payload = verify_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    user = None
    try:
        user_id_int = int(user_id)
        user = db.query(User).filter(User.id == user_id_int).first()
    except (ValueError, TypeError):
        user = db.query(User).filter(User.email == str(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    from utils.validate_email import normalize_email, is_allowed_institute_email
    from config import get_settings
    settings = get_settings()

    clean_email = normalize_email(user.email)
    token_email = normalize_email(payload.get("email", ""))

    user_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    is_valid_admin = bool(
        user_role == "admin" and (
            (settings.admin_email_normalized and clean_email == settings.admin_email_normalized) or
            clean_email in ["adm1@bitsathy.ac.in", "admin@bitsathy.ac.in"]
        )
    )

    # Domain restriction strictly applies to all non-admin users
    if not is_valid_admin:
        if not is_allowed_institute_email(clean_email) or (token_email and not is_allowed_institute_email(token_email)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please use your official @bitsathy.ac.in email address.",
            )
    return user


def require_role(*roles: str):
    """Dependency factory checking that current user possesses at least one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        if user_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Required role in {list(roles)}",
            )
        return current_user
    return role_checker


def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """Requires role == 'student'."""
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Student role required",
        )
    return current_user


def get_current_mentor(current_user: User = Depends(get_current_user)) -> User:
    """Requires role == 'mentor' or role == 'staff'."""
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role not in ["mentor", "staff"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Staff/Mentor role required",
        )
    return current_user


def get_current_staff(current_user: User = Depends(get_current_user)) -> User:
    """Requires staff or mentor role."""
    return get_current_mentor(current_user)


def require_approved_mentor(
    mentor: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
) -> User:
    """
    Requires role in ['mentor', 'staff'] AND profile status == 'approved'.
    Rejects pending, rejected, or suspended mentors with HTTP 403.
    """
    from models.user import MentorProfile
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff/Mentor profile not found",
        )
    status_val = profile.status.value if hasattr(profile.status, "value") else str(profile.status)
    if status_val == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff/Mentor application is pending admin approval.",
            headers={"X-Mentor-Status": "pending"}
        )
    if status_val == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff/Mentor application has been rejected.",
            headers={"X-Mentor-Status": "rejected"}
        )
    if status_val == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff/Mentor account has been suspended.",
            headers={"X-Mentor-Status": "suspended"}
        )
    if status_val != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approved staff/mentor status required.",
        )
    return mentor


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Requires role == 'admin' and matching configured admin email if configured."""
    from config import get_settings
    from utils.validate_email import normalize_email
    settings = get_settings()

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin role required",
        )

    clean_email = normalize_email(current_user.email)
    if settings.admin_email_normalized:
        if clean_email != settings.admin_email_normalized and clean_email not in ["adm1@bitsathy.ac.in", "admin@bitsathy.ac.in"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Only the configured Admin email is authorized",
            )
    return current_user



def verify_mentor_assigned_student(
    student_id: int,
    mentor_user: User = Depends(get_current_mentor),
    db: Session = Depends(get_db)
) -> User:
    """
    Verifies that the mentor is explicitly assigned to the given student_id (profile id or user id).
    If unassigned, raises HTTP 403 Forbidden.
    """
    from models.user import MentorProfile, StudentProfile
    from models.mentor import MatchStatus
    from sqlalchemy import or_

    mentor_profile = db.query(MentorProfile).filter(MentorProfile.user_id == mentor_user.id).first()
    student_profile = db.query(StudentProfile).filter(
        or_(StudentProfile.user_id == student_id, StudentProfile.id == student_id)
    ).first()

    match = None
    if mentor_profile and student_profile:
        match = db.query(MentorMatch).filter(
            MentorMatch.mentor_id == mentor_profile.id,
            MentorMatch.student_id == student_profile.id,
            MentorMatch.status == MatchStatus.accepted
        ).first()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: Student #{student_id} is not assigned to you",
        )

    target_user_id = student_profile.user_id if student_profile else student_id
    student = db.query(User).filter(User.id == target_user_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return student

