# ייבוא FastAPI עצמה + כלי לזריקת שגיאות HTTP (404, 400 וכו')
from fastapi import FastAPI, HTTPException

# ייבוא ה-middleware שמאפשר לדפדפן לשלוח בקשות לשרת (CORS)
from fastapi.middleware.cors import CORSMiddleware

# ייבוא הכלים ליצירת מודל נתונים עם אילוצים
from pydantic import BaseModel, Field

# Optional מאפשר לשדה להיות None (לא חובה למלא)
from typing import Optional

# לקריאה וכתיבה של קובץ JSON
import json

# יצירת האפליקציה — זה האובייקט הראשי שמנהל את כל ה-API
app = FastAPI()

# הגדרת CORS — בלי זה הדפדפן יחסום בקשות מה-frontend לשרת
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # מאפשר גישה מכל כתובת (בפרויקט אמיתי תגבילו)
    allow_methods=["*"],   # מאפשר כל סוג בקשה: GET, POST, PUT, DELETE
    allow_headers=["*"],   # מאפשר כל header בבקשה
)


# מודל המוצר — מגדיר איך נראה מוצר ומה מותר/אסור להכניס
class Product(BaseModel):
    name: str                              # שם המוצר — חובה
    description: Optional[str] = None     # תיאור — לא חובה, ברירת מחדל None
    price: float = Field(gt=0)            # מחיר — חובה, חייב להיות גדול מ-0
    stock_quantity: int = Field(ge=0)     # כמות במלאי — חובה, חייב להיות 0 או יותר
    category: str = "general"             # קטגוריה — לא חובה, ברירת מחדל "general"

# Model for the purchase request body
class PurchaseRequest(BaseModel):
    quantity: int = Field(gt=0)     # Quantity to purchase — must be greater than 0

# Path to the JSON file where products are stored
DB_FILE = "products.json"

# Reads all products from the JSON file
def load_products():
    try:
        with open(DB_FILE, "r") as f:
            return json.load(f)         # Returns a list of products
    except FileNotFoundError:           # File doesn't exist yet (first run)
        return []                       # Start with an empty list
    except json.JSONDecodeError:        # File exists but content is corrupted
        return []                       # Start with an empty list

# Writes the products list back to the JSON file
def save_products(products: list):
    with open(DB_FILE, "w") as f:
        json.dump(products, f)          # Converts the list to JSON and writes it

# Returns all products from the catalog
@app.get("/")
def root():
    return {"message": "Welcome to the Online Store API!"}

# Returns all products, optionally filtered by category
@app.get("/products")
def get_products(category: Optional[str] = None):
    products = load_products()

    # If category is provided, filter the list
    if category:
        products = [p for p in products if p["category"] == category]

    return products

# Returns products with stock quantity below the given threshold
@app.get("/products/low-stock")
def get_low_stock(threshold: int = 5):
    products = load_products()

    # Filter products where stock is below the threshold
    low_stock = [p for p in products if p["stock_quantity"] <= threshold]

    return low_stock

# Returns the total value of all products in stock (price * stock_quantity)
@app.get("/products/inventory-value")
def get_inventory_value():
    products = load_products()

    # Calculate total value: sum of price * stock_quantity for each product
    total = sum(p["price"] * p["stock_quantity"] for p in products)

    return {"total_inventory_value": total}


# Returns a single product by its ID
@app.get("/products/{product_id}")
def get_product(product_id: int):
    products = load_products()          # Load all products

    # Search for the product with the matching ID
    for product in products:
        if product["id"] == product_id:
            return product              # Found — return it

    # If we got here, the product was not found
    # Raise is a HTTP exception that FastAPI will handle and return a 404 response
    raise HTTPException(status_code=404, detail="Product not found")



# Adds a new product to the catalog
@app.post("/products")
def create_product(product: Product):
    products = load_products()          # Load existing products

    # Check if a product with the same name already exists
    if any(p["name"] == product.name for p in products):
        raise HTTPException(status_code=400, detail="Product name already exists")

    # Generate a new unique ID (max existing ID + 1, or 1 if list is empty)
    new_id = max((p["id"] for p in products), default=0) + 1

    # Build the new product as a dictionary with the generated ID
    new_product = {"id": new_id, **product.model_dump()}

    products.append(new_product)        # Add to the list
    save_products(products)             # Save to JSON file
    return new_product                  # Return the created product

# Updates an existing product by its ID
@app.put("/products/{product_id}")
def update_product(product_id: int, updated_product: Product):
    products = load_products()          # Load all products

    # Find the index of the product in the list
    # Enumerate gives us both the index and the product itself as a tuple
    for index, product in enumerate(products):
        if product["id"] == product_id:
            # Replace the product data but keep the original ID
            products[index] = {"id": product_id, **updated_product.model_dump()}
            save_products(products)     # Save updated list to file
            return products[index]      # Return the updated product

    # If we got here, the product was not found
    raise HTTPException(status_code=404, detail="Product not found")

# Deletes a product by its ID
@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    products = load_products()          # Load all products

    # Find the product with the matching ID
    for product in products:
        if product["id"] == product_id:
            products.remove(product)    # Remove it from the list
            save_products(products)     # Save updated list to file
            return {"message": "Product deleted successfully"}

    # If we got here, the product was not found
    raise HTTPException(status_code=404, detail="Product not found")

# Purchases a product — reduces stock by the requested quantity
@app.post("/products/{product_id}/purchase")
def purchase_product(product_id: int, request: PurchaseRequest):
    products = load_products()          # Load all products

    # Find the product with the matching ID
    for product in products:
        if product["id"] == product_id:

            # Check if there is enough stock
            if request.quantity > product["stock_quantity"]:
                raise HTTPException(status_code=400, detail="Not enough stock available")

            # Reduce the stock by the requested quantity
            product["stock_quantity"] -= request.quantity
            save_products(products)     # Save updated list to file
            return product              # Return the updated product

    # If we got here, the product was not found
    raise HTTPException(status_code=404, detail="Product not found")

# Path to the categories JSON file
CATEGORIES_FILE = "categories.json"

# Reads all categories from the JSON file
def load_categories():
    try:
        with open(CATEGORIES_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return ["general", "electronics", "clothing", "food", "books"] # Default categories

# Writes categories list to the JSON file
def save_categories(categories: list):
    with open(CATEGORIES_FILE, "w") as f:
        json.dump(categories, f)

# Returns all categories
@app.get("/categories")
def get_categories():
    return load_categories()

# Adds a new category
@app.post("/categories/{category_name}")
def add_category(category_name: str):
    categories = load_categories()
    if category_name in categories:
        raise HTTPException(status_code=400, detail="Category already exists")
    categories.append(category_name)
    save_categories(categories)
    return {"message": f"Category '{category_name}' added"}

# Deletes a category
@app.delete("/categories/{category_name}")
def delete_category(category_name: str):
    categories = load_categories()
    if category_name not in categories:
        raise HTTPException(status_code=404, detail="Category not found")
    categories.remove(category_name)
    save_categories(categories)
    return {"message": f"Category '{category_name}' deleted"}

