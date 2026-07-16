from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/me", tags=["users"])


@router.get("", response_model=UserRead, summary="Get the current authenticated user")
async def get_current_user_profile(current_user: CurrentUser) -> User:
    return current_user
