// Base URL of the backend server — empty string means "same host/port the page was loaded from",
// so this works no matter which address (localhost, LAN IP, hostname) is used to reach the server
const API_URL = "";

// Shopping cart
let cart = [];

// Shows a message to the user (success or error)
function showMessage(text, isError = false) {
    const msg = document.getElementById("message");
    msg.textContent = text;
    msg.className = isError ? "error" : "success";
}

// Fetches all products and displays them
async function loadProducts() {
    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();

    const container = document.getElementById("products");
    container.innerHTML = "";

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <div class="product-image">🛍️</div>
                <h3>${product.name}</h3>
                <p class="price">$${product.price}</p>
                <p class="${product.stock_quantity > 0 ? 'stock' : 'out-of-stock'}">
                    ${product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                </p>
                <p>${product.description || ""}</p>
                <p>Category: ${product.category}</p>
                <input type="number" id="qty-${product.id}" placeholder="Quantity" min="1">
                <button class="btn-buy" onclick="purchaseProduct(${product.id})">Buy Now</button>
                <button class="btn-cart" onclick="addToCart(${product.id}, '${product.name}', ${product.price}, ${product.stock_quantity})">Add to Cart</button>
            </div>
        `;

    });
}

// Sends a POST request to purchase a product directly
async function purchaseProduct(id) {
    const quantity = parseInt(document.getElementById(`qty-${id}`).value);

    const res = await fetch(`${API_URL}/products/${id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: quantity })
    });

    if (!res.ok) {
        const err = await res.json();
        showMessage(err.detail, true);
        return;
    }

    showMessage("Purchase successful!");
    loadProducts();
}

// Adds a product to the cart
function addToCart(id, name, price, stock) {
    const quantity = parseInt(document.getElementById(`qty-${id}`).value);

    if (!quantity || quantity <= 0) {
        showMessage("Please enter a valid quantity", true);
        return;
    }

    if (quantity > stock) {
        showMessage(`Not enough stock. Only ${stock} available.`, true);
        return;
    }

    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id, name, price, quantity });
    }

    showMessage(`${name} added to cart!`);
    renderCart();
}

// Displays the cart contents
function renderCart() {
    const container = document.getElementById("cart-items");
    container.innerHTML = "";

    if (cart.length === 0) {
        container.innerHTML = "<p>Cart is empty</p>";
        return;
    }

    cart.forEach(item => {
        container.innerHTML += `
            <p>${item.name} x${item.quantity} — $${item.price * item.quantity}</p>
        `;
    });
}

// Sends a purchase request for each item in the cart
async function checkoutCart() {
    if (cart.length === 0) {
        showMessage("Cart is empty", true);
        return;
    }

    for (const item of cart) {
        const res = await fetch(`${API_URL}/products/${item.id}/purchase`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: item.quantity })
        });

        if (!res.ok) {
            const err = await res.json();
            showMessage(`${item.name}: ${err.detail}`, true);
            return;
        }
    }

    cart = [];
    renderCart();
    loadProducts();
    showMessage("Checkout successful!");
}

// Fetches products filtered by category
async function filterByCategory() {
    const category = document.getElementById("filter-category").value;
    const res = await fetch(`${API_URL}/products?category=${category}`);
    const products = await res.json();

    const container = document.getElementById("products");
    container.innerHTML = "";

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <h3>${product.name}</h3>
                <p>Price: $${product.price}</p>
                <p>Stock: ${product.stock_quantity}</p>
                <p>Category: ${product.category}</p>
                <p>${product.description || ""}</p>
                <input type="number" id="qty-${product.id}" placeholder="Quantity" min="1">
                <button onclick="purchaseProduct(${product.id})">Buy Now</button>
                <button onclick="addToCart(${product.id}, '${product.name}', ${product.price}, ${product.stock_quantity})">Add to Cart</button>
            </div>
        `;
    });
}

// Load products when the page opens
loadProducts();
