import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Online Store API!"}


def test_get_products_returns_list():
    response = client.get("/products")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_categories_returns_list():
    response = client.get("/categories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_product_not_found():
    response = client.get("/products/999999")
    assert response.status_code == 404


def test_low_stock_default_threshold():
    response = client.get("/products/low-stock")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
