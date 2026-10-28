"""
schemas/auth.py — Pydantic schemas for auth endpoints.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from models.user import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.student
    name: str = Field(..., min_length=1, max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
