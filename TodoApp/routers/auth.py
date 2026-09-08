from typing import Annotated
from datetime import timedelta, timezone, datetime

from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models import Users
from starlette import status 
from database import SessionLocal
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError

router = APIRouter(
    prefix = '/auth',
    tags = ['auth']
)

## This is a random long string. Currently generated with "openssl rand -hex 32"
SECRET_KEY = "5e6c19947439178247795835865ed4d8ed33e5a83285cce4db02b18c91c95ec1"
ALGORITHM = "HS256"

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

class CreateUserRequest(BaseModel):
    username: str
    email: str 
    first_name: str 
    last_name: str 
    password: str 
    role: str

class Token(BaseModel):
    access_token: str 
    token_type: str

@router.get("/")
async def get_user(db: db_dependency):
    return db.query(Users).all()


@router.post('/')
async def create_user(create_user_request: CreateUserRequest, db: db_dependency):
    # Since here we have mentioned Password and the Table contains the column names 
    # as Hassed_passowrd it will thrown an error So need to declare with names
    
    create_user = Users(
        username = create_user_request.username,
        email = create_user_request.email,
        first_name = create_user_request.first_name,
        last_name = create_user_request.last_name,
        role = create_user_request.role,
        hashed_password = bcrypt_context.hash(create_user_request.password),
        is_active = True
    )

    db.add(create_user)
    db.commit()


def authenticate_user(username: str, password:str, db):
    user = db.query(Users).filter(Users.username == username).first()

    if not user:
        return False
    if not bcrypt_context.verify(password,user.hashed_password):
        return False
    return user

def create_access_token(username:str, user_id: int, role: str, expires_delta: timedelta):
    encode = {'sub': username, 'id': user_id, 'role': role}
    expires = datetime.now(timezone.utc) + expires_delta 
    encode.update({'exp': expires})

    return jwt.encode(encode,SECRET_KEY, ALGORITHM)

async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    try: 
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub') # sub is what used for encoding of the token
        user_id:  int = payload.get('id') 
        user_role: str = payload.get('role')

        if username is None or user_id is None:
            raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail='Could not verify User')
        return {"username": username,  "id": user_id, "user_role": user_role}
    except JWTError:
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail='Could not verify User')
        



@router.post("/token")
async def get_login_token(token: Annotated[OAuth2PasswordRequestForm, Depends()], db: db_dependency):
    user_authentication_status = authenticate_user(token.username, token.password, db)

    if not user_authentication_status:
        raise HTTPException(status_code= status.HTTP_401_UNAUTHORIZED, detail='Could not verify User')

    token = create_access_token(user_authentication_status.username, user_authentication_status.id,user_authentication_status.role, timedelta(minutes=20))
    
    return {"access_token": token,"token_type": "bearer"}
