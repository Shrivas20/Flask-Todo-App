from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Users
from starlette import status 
from pydantic import BaseModel, Field

from .auth import get_current_user, CreateUserRequest, bcrypt_context

router = APIRouter(
    prefix = '/users',
    tags = ['users']
) 

def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

class Password_Change(BaseModel):
      password: str 
      new_password: str

## Import form the Auth itself 
# SECRET_KEY = "5e6c19947439178247795835865ed4d8ed33e5a83285cce4db02b18c91c95ec1"
# ALGORITHM = "HS256"

# bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


@router.get('/',status_code=status.HTTP_200_OK)
async def get_current_user(user:user_dependency, db:db_dependency):

    if user is None:
            raise HTTPException(status_code=401, detail='Authentication Failed')

    user_model = db.query(Users).filter(Users.id == user.get("id")).first()

    return user_model

@router.put('/user/password_change',status_code=status.HTTP_202_ACCEPTED)
async def change_password(user: user_dependency, db:db_dependency, user_request: Password_Change):

      if user is None:
                 raise HTTPException(status_code=401, detail='Authentication Failed')

      user_model = db.query(Users).filter(Users.id == user["id"]).first()

      if not bcrypt_context.verify(user_request.password, user_model.hashed_password):
            raise HTTPException(status_code=404, detail="User old password didnt match")

      user_model.hashed_password = bcrypt_context.hash(user_request.new_password)

      db.add(user_model)
      db.commit()

