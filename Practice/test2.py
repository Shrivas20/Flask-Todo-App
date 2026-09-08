from typing import Optional

from fastapi import FastAPI, Body
from pydantic import BaseModel, Field

class Book:
    def __init__(self,id:int, author:str, title:str, description:str, rating:int):
        self.id = id 
        self.author =author
        self.title = title
        self.description = description
        self.rating = rating 

class Book_Request(BaseModel):
    id: Optional[int] = None
    author: str = Field(min_length=3, max_length=10)
    title: str = Field(min_length=2, max_length=10)
    description: str = Field(max_length=100)
    rating: int = Field(ge=0, le=10)

Books = [
    Book(1, "Author1", "Book1", "Life Story",10),
    Book(2, "Author1", "Book2", "Life Tragedy Story",6),
    Book(1, "Author2", "Book12", "Anime",2),
    Book(1, "Author3", "One Piece", "Life of a Pirate King",8),
]

app = FastAPI()

@app.get("/books")
async def get_books():
    return Books 

@app.post("/add_books")
async def add_books(new_book = Body()):
    Books.append(new_book)

@app.post("/add_books_py")
async def add_books(book_request: Book_Request):
    new_book = Book(**book_request.model_dump())
    Books.append(find_new_id(new_book))
    return new_book

def find_new_id(incoming_book: Book):
    incoming_book.id = 1 if len(Books) == 0 else len(Books)+1
    return incoming_book

@app.get("/books/")
async def get_book_byid(id:int):
    for book in Books:
        if book.id == id:
            return book

@app.put('/book_update')
async def book_update(new_book: Book_Request):
    for book in Books:
        if book.id == new_book.id:
            book = new_book
            break 
    return f"Successfully updated the Book with Id: {new_book.title}"

@app.delete("/book_delete/{id}")
async def del_book(id: int):
    for i in range (0,len(Books)):
        if Books[i].id == id:
            Books.pop(i)
            break  