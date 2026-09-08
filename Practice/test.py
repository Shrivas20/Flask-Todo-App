from fastapi import Body, FastAPI

app = FastAPI()

books = [
    {
        "title": "The Hobbit",
        "author": "J.R.R. Tolkien",
        "category": "Fantasy"
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "category": "Dystopian"
    },
    {
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "category": "Fiction"
    },
    {
        "title": "The Alchemist",
        "author": "George Orwell",
        "category": "Fantasy"
    },
    {
        "title": "Atomic Habits",
        "author": "James Clear",
        "category": "Self-Help"
    }
]
@app.get('/books')
async def get_all_books():
    return books

@app.get('/books/{title}')
async def get_current_book(title: str):
    for book in books:
        if book.get("title").lower() == title.lower():
            return book 

    return {"Error":"Book ID not found"}

@app.get('/books/')
async def get_all_books_category(category: str):
    filter_books =[] 
    for book in books:
        if book.get("category").lower() == category.lower():
            filter_books.append(book)
    return filter_books

@app.get('/books_filter/{author}')
async def filterby_author_category(author: str, category: str):
    filtered_books = [] 
    for book in books:
        if book.get('author').lower() == author.lower() and book.get('category').lower() == category.lower():
            filtered_books.append(book)
    return filtered_books

@app.post('/books/add_book')
async def add_book(newbook = Body()):
    books.append(newbook)
    return "Added to books, Success"

@app.get("/books/author_book/{author}")
async def get_author_books(author: str):
    author_list = [] 
    for book in books:
        if book.get("author").lower() == author.lower():
            author_list.append(book)
    return author_list
