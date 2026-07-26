// Base URL of the backend server — empty string means "same host/port the page was loaded from",
// so this works no matter which address (localhost, LAN IP, hostname) is used to reach the server
const API_URL = "";

// Shows a message to the user (success or error)
function showMessage(text, isError = false) {
    const msg = document.getElementById("message");
    msg.textContent = text;                          // Set the message text
    msg.className = isError ? "error" : "success";   // Red if error, green if success
}

// Fetches all products from the server and displays them
async function loadProducts() {
    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();

    const container = document.getElementById("products");
    container.innerHTML = "";

    // Create a card for each product
    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                 <input type="checkbox" id="check-${product.id}" value="${product.id}"> <!-- Product selection checkbox -->

                <h3>${product.name}</h3>
                <p>ID: ${product.id}</p>

                <p>Price: $${product.price}</p>
                <p>Stock: ${product.stock_quantity}</p>
                <p>Category: ${product.category}</p>
                <p>${product.description || ""}</p>

                <!-- Delete button -->
                <button onclick="deleteProduct(${product.id})">Delete</button>

                <!-- Edit button — fills the form with current product data -->
                <button onclick="editProduct(${product.id}, '${product.name}', '${product.description || ""}', ${product.price}, ${product.stock_quantity}, '${product.category}')">Edit</button>

                <!-- Purchase input and button -->
                <input type="number" id="qty-${product.id}" placeholder="Quantity" min="1">
                <button onclick="purchaseProduct(${product.id})">Buy</button>
           
                <!-- Add to cart button — adds product to cart with selected quantity -->
                <button onclick="addToCart(${product.id}, '${product.name}', ${product.price}, ${product.stock_quantity})">Add to Cart</button>

            </div>
        `;

    });
}


// Load products when the page first opens
loadProducts();
loadCategories();


// Reads input values from the form and sends a POST request to add a new product
async function addProduct() {
    const product = {
        name: document.getElementById("name").value,               // Get name input value
        description: document.getElementById("description").value, // Get description input value
        price: parseFloat(document.getElementById("price").value), // Convert string to float
        stock_quantity: parseInt(document.getElementById("stock").value), // Convert string to int
        category: document.getElementById("category").value        // Get category input value
    };

    const res = await fetch(`${API_URL}/products`, {
        method: "POST",                             // POST request
        headers: { "Content-Type": "application/json" }, // Tell server we're sending JSON
        body: JSON.stringify(product)               // Convert JS object to JSON string
    });

    if (!res.ok) {
        const err = await res.json();               // Parse the error response
        showMessage(err.detail, true);              // Show error message in red
        return;
    }

    showMessage("Product added successfully!");     // Show success message in green
    loadProducts();                                 // Refresh the product list
}

    
    // Sends a DELETE request to remove a product by its ID
async function deleteProduct(id) {
        // Ask for confirmation before deleting
    const confirmed = confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;                             // Cancel if user clicks "Cancel"
   
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE"                            // DELETE request
    });

    if (!res.ok) {
        const err = await res.json();               // Parse the error response
        showMessage(err.detail, true);              // Show error message in red
        return;
    }

    showMessage("Product deleted successfully!");   // Show success message in green
    loadProducts();                                 // Refresh the product list
}

// Sends a POST request to purchase a product by its ID
async function purchaseProduct(id) {
    const quantity = parseInt(document.getElementById(`qty-${id}`).value); // Get quantity input

    const res = await fetch(`${API_URL}/products/${id}/purchase`, {
        method: "POST",                             // POST request
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: quantity }) // Send quantity in request body
    });

    if (!res.ok) {
        const err = await res.json();               // Parse the error response
        showMessage(err.detail, true);              // Show error message in red
        return;
    }

    showMessage("Purchase successful!");            // Show success message in green
    loadProducts();                                 // Refresh the product list
}

// Fetches products filtered by category
async function filterByCategory() {
    const category = document.getElementById("filter-category").value; // Get filter input

    const res = await fetch(`${API_URL}/products?category=${category}`); // GET /products?category=...
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
                <button onclick="deleteProduct(${product.id})">Delete</button>
                <button onclick="editProduct(${product.id}, '${product.name}', '${product.description || ""}', ${product.price}, ${product.stock_quantity}, '${product.category}')">Edit</button>
                <input type="number" id="qty-${product.id}" placeholder="Quantity" min="1">
                <button onclick="purchaseProduct(${product.id})">Buy</button>
            </div>
        `;
    });
}

// Fetches and displays products with stock below the threshold (default 5)
async function showLowStock() {
    const res = await fetch(`${API_URL}/products/low-stock`); // GET /products/low-stock
    const products = await res.json();

    const container = document.getElementById("products");
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = "<p>No low stock products!</p>";
        return;
    }

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <h3>${product.name} ⚠️ Low Stock</h3>
                <p>Price: $${product.price}</p>
                <p>Stock: ${product.stock_quantity}</p>
                <p>Category: ${product.category}</p>
            </div>
        `;
    });
}

// Fetches and displays the total inventory value
async function showInventoryValue() {
    const res = await fetch(`${API_URL}/products/inventory-value`); // GET /products/inventory-value
    const data = await res.json();

    showMessage(`Total inventory value: $${data.total_inventory_value}`); // Show value in green
}

// Shopping cart — stores selected products and quantities
let cart = [];

// Adds a product to the cart
function addToCart(id, name, price, stock) {
    const quantity = parseInt(document.getElementById(`qty-${id}`).value);

    if (!quantity || quantity <= 0) {
        showMessage("Please enter a valid quantity", true);
        return;
    }

    // Check if quantity exceeds available stock
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


// Displays the current cart contents
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

    // Send a purchase request for each item in the cart
    for (const item of cart) {
        const res = await fetch(`${API_URL}/products/${item.id}/purchase`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: item.quantity })
        });

        if (!res.ok) {
            const err = await res.json();
            showMessage(`${item.name}: ${err.detail}`, true); // Show which product failed
            return; // Stop checkout if any item fails
        }
    }

    cart = [];          // Clear the cart after successful checkout
    renderCart();       // Refresh cart display
    loadProducts();     // Refresh product list to show updated stock
    showMessage("Checkout successful!");
}

// Fetches all categories and updates the dropdown and category list
async function loadCategories() {
    const res = await fetch(`${API_URL}/categories`);
    const categories = await res.json();

    // Update the dropdown
    const select = document.getElementById("category-select");
    select.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");

    // Update the category list with delete buttons
    const list = document.getElementById("category-list");
    list.innerHTML = categories.map(c => `
        <span>${c} <button onclick="deleteCategory('${c}')">x</button></span>
    `).join(" | ");
}

// Adds a new category
async function addCategory() {
    const name = document.getElementById("new-category").value;
    if (!name) {
        showMessage("Please enter a category name", true);
        return;
    }

    const res = await fetch(`${API_URL}/categories/${name}`, { method: "POST" });

    if (!res.ok) {
        const err = await res.json();
        showMessage(err.detail, true);
        return;
    }

    showMessage(`Category '${name}' added!`);
    document.getElementById("new-category").value = ""; // Clear input
    loadCategories(); // Refresh category list
}

// Deletes a category
async function deleteCategory(name) {
    const confirmed = confirm(`Delete category '${name}'?`);
    if (!confirmed) return;

    const res = await fetch(`${API_URL}/categories/${name}`, { method: "DELETE" });

    if (!res.ok) {
        const err = await res.json();
        showMessage(err.detail, true);
        return;
    }

    showMessage(`Category '${name}' deleted!`);
    loadCategories(); // Refresh category list
}

// Returns a list of all checked product IDs
function getCheckedIds() {
    const checkboxes = document.querySelectorAll("input[type='checkbox']:checked");
    return Array.from(checkboxes).map(cb => parseInt(cb.value)); // Convert to array of IDs
}

// Deletes all checked products
async function bulkDelete() {
    const ids = getCheckedIds();
    if (ids.length === 0) {
        showMessage("No products selected", true);
        return;
    }

    const confirmed = confirm(`Delete ${ids.length} products?`);
    if (!confirmed) return;

    // Send a DELETE request for each selected product
    for (const id of ids) {
        await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
    }

    showMessage(`${ids.length} products deleted!`);
    loadProducts();
}

// Adds all checked products to the cart with quantity 1
async function bulkAddToCart() {
    const ids = getCheckedIds();
    if (ids.length === 0) {
        showMessage("No products selected", true);
        return;
    }

    // Find each checked product and add to cart with quantity 1
    ids.forEach(id => {
        const name = document.querySelector(`#check-${id}`).closest(".product-card").querySelector("h3").textContent;
        const priceText = document.querySelector(`#check-${id}`).closest(".product-card").querySelectorAll("p")[1].textContent;
        const price = parseFloat(priceText.replace("Price: $", ""));
        
        const existing = cart.find(item => item.id === id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ id, name, price, quantity: 1 });
        }
    });

    showMessage(`${ids.length} products added to cart!`);
    renderCart();
}

// Fills the form with the product's current data so the user can edit it
function editProduct(id, name, description, price, stock, category) {
    document.getElementById("name").value = name;
    document.getElementById("description").value = description;
    document.getElementById("price").value = price;
    document.getElementById("stock").value = stock;
    document.getElementById("category").value = category;

    // Change the Add button to an Update button
    const btn = document.querySelector("#add-product button");
    btn.textContent = "Update Product";
    btn.onclick = () => updateProduct(id);
}

// Sends a PUT request to update the product with the given ID
async function updateProduct(id) {
    const product = {
        name: document.getElementById("name").value,
        description: document.getElementById("description").value,
        price: parseFloat(document.getElementById("price").value),
        stock_quantity: parseInt(document.getElementById("stock").value),
        category: document.getElementById("category").value
    };

    const res = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
    });

    if (!res.ok) {
        const err = await res.json();
        showMessage(err.detail, true);
        return;
    }

    // Reset the button back to Add Product
    const btn = document.querySelector("#add-product button");
    btn.textContent = "Add Product";
    btn.onclick = addProduct;

    showMessage("Product updated successfully!");
    loadProducts();
}
