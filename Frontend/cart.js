let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-container");
  container.innerHTML = "<h2>Your Cart</h2>";

  if (cart.length === 0) {
    container.innerHTML += "<p>Cart is empty.</p>";
    return;
  }

  cart.forEach(item => {
    container.innerHTML += `
      <div class="cart-item">
        ${item.image ? `<img src="${item.image}" width="60" height="60" style="object-fit:cover;border-radius:6px;">` : ""}
        <strong>${item.name}</strong>
        <span style="margin-left:auto;">
          $${item.price.toFixed(2)} × 
          <button onclick="decreaseQty(${item.id})">−</button>
          ${item.qty}
          <button onclick="increaseQty(${item.id})">+</button>
        </span>
        <button onclick="removeFromCart(${item.id})" style="margin-left:10px;">Remove</button>
      </div>
    `;
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  container.innerHTML += `<p><strong>Total: $${total.toFixed(2)}</strong></p>`;
  container.innerHTML += `<button onclick="proceedToCheckout()">Proceed to Checkout</button>`;
}

function increaseQty(id) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += 1;
    saveCart();
  }
}

function decreaseQty(id) {
  const item = cart.find(i => i.id === id);
  if (item) {
    if (item.qty > 1) {
      item.qty -= 1;
    } else {
      cart = cart.filter(i => i.id !== id);
    }
    saveCart();
  }
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
}

function proceedToCheckout() {
  window.location.href = "/checkout.html";
}

window.onload = renderCart;
