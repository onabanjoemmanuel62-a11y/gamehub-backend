let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  renderCart();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const countElement = document.getElementById('cart-count');
  if (countElement) {
    countElement.textContent = count;
  }
}

function renderCart() {
  const container = document.getElementById("cart-content");
  
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added any games yet. Browse our amazing deals!</p>
        <a href="/index.html" class="shop-now-btn">Start Shopping</a>
      </div>
    `;
    return;
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Render cart items
  const itemsHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      ${item.image ? `<img src="${item.image}" alt="${item.name}">` : '<img src="/api/placeholder/100/100" alt="Game">'}
      <div class="item-details">
        <div class="item-name">${item.name}</div>
        <div class="item-price">$${item.price.toFixed(2)}</div>
      </div>
      <div class="quantity-controls">
        <button class="qty-btn" onclick="decreaseQty(${item.id})">−</button>
        <span class="qty-display">${item.qty}</span>
        <button class="qty-btn" onclick="increaseQty(${item.id})">+</button>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${item.id})">🗑️ Remove</button>
    </div>
  `).join('');

  // Render summary
  const summaryHTML = `
    <div class="cart-summary">
      <h2 class="summary-title">Order Summary</h2>
      <div class="summary-row">
        <span class="summary-label">Items (${itemCount})</span>
        <span class="summary-value">$${subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Shipping</span>
        <span class="summary-value" style="color: var(--accent);">FREE</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total</span>
        <span class="total-value">$${subtotal.toFixed(2)}</span>
      </div>
      <button class="checkout-btn" onclick="proceedToCheckout()">
        Proceed to Checkout
      </button>
      <a href="/index.html" class="continue-shopping">Continue Shopping</a>
    </div>
  `;

  container.innerHTML = `
    <div class="cart-items">
      ${itemsHTML}
    </div>
    ${summaryHTML}
  `;
}

function increaseQty(id) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += 1;
    saveCart();
    
    // Add animation effect
    const itemElement = document.querySelector(`[data-id="${id}"]`);
    if (itemElement) {
      itemElement.style.animation = 'none';
      setTimeout(() => {
        itemElement.style.animation = 'slideIn 0.3s ease';
      }, 10);
    }
  }
}

function decreaseQty(id) {
  const item = cart.find(i => i.id === id);
  if (item) {
    if (item.qty > 1) {
      item.qty -= 1;
      saveCart();
      
      // Add animation effect
      const itemElement = document.querySelector(`[data-id="${id}"]`);
      if (itemElement) {
        itemElement.style.animation = 'none';
        setTimeout(() => {
          itemElement.style.animation = 'slideIn 0.3s ease';
        }, 10);
      }
    } else {
      removeFromCart(id);
    }
  }
}

function removeFromCart(id) {
  const itemElement = document.querySelector(`[data-id="${id}"]`);
  
  // Add fade-out animation
  if (itemElement) {
    itemElement.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      cart = cart.filter(item => item.id !== id);
      saveCart();
    }, 300);
  } else {
    cart = cart.filter(item => item.id !== id);
    saveCart();
  }
}

function proceedToCheckout() {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }
  window.location.href = "/checkout.html";
}

// Add fadeOut animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    to { opacity: 0; transform: translateX(-100px); }
  }
`;
document.head.appendChild(style);

// Initialize
window.onload = () => {
  updateCartCount();
  renderCart();
};