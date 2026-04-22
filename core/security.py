from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from http import HTTPStatus

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from jose import JWTError, jwt
from pwdlib import PasswordHash

from models.user import User as UserModel
from core.settings import Settings
from core.database import get_db

settings = Settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password=password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hasher.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    token_payload = data.copy()
    token_payload["exp"] = datetime.now(tz=ZoneInfo("UTC")) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return jwt.encode(token_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def authenticate_user(
    session: AsyncSession, email: str, password: str
) -> UserModel | None:

    user = await session.scalar(UserModel.select().where(UserModel.email == email))

    if not user:
        return None

    if not verify_password(password, user.password):
        return None

    return user


async def get_current_user(
    session: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> UserModel | None:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")

        if email is None:
            return None

        user = await session.scalar(select(UserModel).where(UserModel.email == email))

        if user is None:
            return None

        return user

    except JWTError:
        return None


async def require_current_user(
    current_user: UserModel | None = Depends(get_current_user),
) -> UserModel:
    if current_user is None:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    return current_user
