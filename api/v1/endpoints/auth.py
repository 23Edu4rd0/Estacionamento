from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from api.schemas.auth import CurrentUser, Token
from core.database import get_db
from core.security import authenticate_user, create_access_token, get_current_user
from models.user import User as UserModel

router = APIRouter(tags=["Authentication"])


@router.post("/token", status_code=HTTPStatus.OK, response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[AsyncSession, Depends(get_db)],
):
    user = await authenticate_user(
        session=session,
        email=form_data.username,
        password=form_data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(data={"sub": user.email})

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", status_code=HTTPStatus.OK, response_model=CurrentUser)
async def read_current_user(
    current_user: Annotated[UserModel | None, Depends(get_current_user)],
):
    if current_user is None:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    return {"id": current_user.id, "email": current_user.email}
