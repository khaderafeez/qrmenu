let menuItems = {};
let selectedItems = [];

const fetchMenuData = async () => {
    try {
        const response = await fetch(`https://script.google.com/macros/s/AKfycbznKsPA2mf0upNBJ25xvHLVStUEGms2VcYzsN_pbQIEc9b1A0Fhtl82a_VYlnZXw_NXDg/exec?t=${Date.now()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        populateMenu(data);
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById('menu-content').innerHTML = `<p>Error loading menu. Please try again later.</p>`;
    }
};

function populateMenu(data) {
    const [headers, ...rows] = data;
    const requiredColumns = ['category', 'items', 'description', 'S', 'M', 'L', 'XL', 'image_url'];
    const columnIndices = {};

    requiredColumns.forEach(column => {
        const index = headers.indexOf(column);
        if (index === -1) {
            throw new Error(`Required column '${column}' is missing`);
        }
        columnIndices[column] = index;
    });

    const categories = new Set();

    rows.forEach(row => {
        const category = row[columnIndices.category].trim().toUpperCase();
        const item = row[columnIndices.items].trim();
        if (category && item) {
            categories.add(category);
            if (!menuItems[category]) {
                menuItems[category] = [];
            }

            const price = {};
            ['S', 'M', 'L', 'XL'].forEach(size => {
                const priceValue = parseFloat(row[columnIndices[size]]);
                if (!isNaN(priceValue)) {
                    price[size] = priceValue.toFixed(2);
                }
            });

            let image = row[columnIndices.image_url];
            if (image && image.includes('drive.google.com')) {
                const fileId = image.match(/d\/([a-zA-Z0-9_-]+)/);
                if (fileId && fileId[1]) {
                    image = `https://drive.google.com/uc?id=${fileId[1]}`;
                }
            }

            menuItems[category].push({
                name: item.toUpperCase(),
                description: row[columnIndices.description],
                price: price,
                image: image
            });
        }
    });

    renderCategorySidebar(Array.from(categories));
    if (categories.size > 0) {
        const firstCategory = Array.from(categories)[0];
        displayMenuItems(firstCategory);
    }
}

function renderCategorySidebar(categories) {
    const categorySidebar = document.getElementById('category-sidebar');
    if (categorySidebar) {
        const sidebarHtml = categories.map(category => 
            `<div class="category-item" data-category="${category}">${category}</div>`
        ).join('');
        categorySidebar.innerHTML = sidebarHtml;
        addCategoryEventListeners();
    }
}

function addCategoryEventListeners() {
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            categoryItems.forEach(ci => ci.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');
            displayMenuItems(category);
            
            // Scroll to top of the page
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });
}

function displayMenuItems(category) {
    const menuContent = document.getElementById('menu-content');
    if (menuContent && menuItems[category]) {
        const itemsHtml = menuItems[category].map(item => createMenuItemHtml(item)).join('');
        menuContent.innerHTML = `
            <h2>${category}</h2>
            <div class="menu-item-grid">${itemsHtml}</div>
        `;
        addMenuItemEventListeners();
    }
}

function createMenuItemHtml(item) {
    return `
        <div class="menu-item">
            <div class="menu-item-image-container">
                <img src="${item.image}" alt="${item.name}" class="menu-item-image">
            </div>
            <div class="menu-item-name">${item.name}</div>
            <div class="menu-item-description">${item.description}</div>
            <div class="menu-item-price">
                ${Object.entries(item.price).map(([size, price]) => 
                    `<div>
                        <input type="radio" name="${item.name}-size" id="${item.name}-${size}" value="${size}" data-price="${price}">
                        <label for="${item.name}-${size}">₹${price} (${size})</label>
                    </div>`
                ).join('')}
            </div>
            <button class="select-item" data-name="${item.name}">Add to Cart</button>
        </div>
    `;
}

function addMenuItemEventListeners() {
    document.querySelectorAll('.select-item').forEach(button => {
        button.addEventListener('click', function() {
            const itemName = this.getAttribute('data-name');
            const itemContainer = this.closest('.menu-item');
            const selectedSize = itemContainer.querySelector('input[type="radio"]:checked');
            
            if (selectedSize) {
                const size = selectedSize.value;
                const price = parseFloat(selectedSize.getAttribute('data-price'));
                addToCart({ name: itemName, size: size, price: price });
            } else {
                alert('Please select a size before adding to cart.');
            }
        });
    });
}

function addToCart(item) {
    const existingItem = selectedItems.find(i => i.name === item.name && i.size === item.size);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        selectedItems.push({ ...item, quantity: 1 });
    }
    updateCart();
}

function updateCart() {
    const cartCount = document.getElementById('cart-count');
    
    const cartItems = document.getElementById('cart-items');
    const totalAmount = document.getElementById('total-amount');

    cartCount.textContent = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    cartItems.innerHTML = selectedItems.map((item, index) => `
        <div class="cart-item">
            <div>${item.name} - ${item.size}</div>
            <div>₹${(item.price * item.quantity).toFixed(2)}</div>
            <div class="quantity-control">
                <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
            </div>
            <button onclick="removeFromCart(${index})">Remove</button>
        </div>
    `).join('');

    const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totalAmount.textContent = total.toFixed(2);
}

function updateQuantity(index, change) {
    selectedItems[index].quantity += change;
    if (selectedItems[index].quantity <= 0) {
        selectedItems.splice(index, 1);
    }
    updateCart();
}

function removeFromCart(index) {
    selectedItems.splice(index, 1);
    updateCart();
}

const cartIcon = document.getElementById('cart-icon');
const cartSidebar = document.getElementById('cart-sidebar');
const checkoutBtn = document.getElementById('checkout-btn');
const modifyOrderBtn = document.getElementById('modify-order-btn');
const orderForm = document.getElementById('order-form');
const sendToWhatsAppBtn = document.getElementById('send-to-whatsapp');
const cancelOrderBtn = document.getElementById('cancel-order');
const confirmationMessage = document.getElementById('confirmation-message');
const closeConfirmation = document.getElementById('close-confirmation');

function openCart() {
    cartSidebar.classList.add('open');
}

function closeCart() {
    cartSidebar.classList.remove('open');
}

cartIcon.addEventListener('click', () => {
    if (cartSidebar.classList.contains('open')) {
        closeCart();
    } else {
        openCart();
    }
});

checkoutBtn.addEventListener('click', () => {
    closeCart();
    orderForm.classList.remove('hidden');
});

modifyOrderBtn.addEventListener('click', () => {
    closeCart();
});

sendToWhatsAppBtn.addEventListener('click', () => {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();

    if (!customerName || !customerAddress) {
        alert('Please fill in all fields');
        return;
    }

    const orderDetails = selectedItems.map(item => 
        `${item.name} (${item.size}) x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const message = `New order from ${customerName}\nDelivery Address: ${customerAddress}\n\n${orderDetails}\n\nTotal: ₹${total.toFixed(2)}`;

    const whatsappNumber = '+91 8105215353'; // Replace with your actual WhatsApp number
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');

    // Show confirmation message
    closeCart();
    orderForm.classList.add('hidden');
    confirmationMessage.classList.remove('hidden');

    // Clear the cart
    selectedItems = [];
    updateCart();
});

cancelOrderBtn.addEventListener('click', () => {
    orderForm.classList.add('hidden');
});

closeConfirmation.addEventListener('click', () => {
    confirmationMessage.classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', fetchMenuData);