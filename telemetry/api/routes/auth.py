from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from telemetry.api.deps import get_current_admin
from telemetry.api.security import create_access_token, verify_password
from telemetry.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str = Field(..., description="Admin username")
    password: str = Field(..., description="Admin password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


class UserResponse(BaseModel):
    username: str
    role: str


@router.post("/login", response_model=TokenResponse, summary="Admin Login")
def login(credentials: LoginRequest):
    configured_password = settings.admin_password_hash or settings.admin_password
    is_user_valid = credentials.username == settings.admin_username
    is_pwd_valid = configured_password and verify_password(
        credentials.password, configured_password
    )

    if not is_user_valid or not is_pwd_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": credentials.username, "role": "admin"})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        username=credentials.username,
        role="admin",
    )


@router.get("/me", response_model=UserResponse, summary="Get Current User Profile")
def get_current_user(admin: dict = Depends(get_current_admin)):
    return UserResponse(username=admin["username"], role=admin["role"])
