from fastapi import APIRouter
from app.schemas.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    name = payload.email.split("@")[0].replace(".", " ").title()
    return {
        "token": "bearer-skilltrace-session-token",
        "user": {
            "name": name or "Director Reynolds",
            "email": payload.email,
            "role": "Workforce Director"
        }
    }
