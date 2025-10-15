let cart = JSON.parse(localStorage.getItem("cart")) || [];

function renderCheckout() {
  const container = document.getElementById("checkout-container");
  container.innerHTML = "<h2>Order Summary</h2>";
  if (cart.length === 0) {
    container.innerHTML += "<p>Your cart is empty. <a href='/index.html'>Go shopping</a></p>";
    return;
  }
  // Show each item in the order summary
  cart.forEach(item => {
    container.innerHTML += `
      <div class="cart-item">
        ${item.image ? `<img src="${item.image}" width="50" style="border-radius:6px;object-fit:cover;">` : ""}     
        ${item.name} - $${item.price.toFixed(2)} × ${item.qty}
      </div>
    `;
  });
  // Calculate total
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  container.innerHTML += `<p><strong>Total: $${total.toFixed(2)}</strong></p>`;
  // Billing + Payment form
  container.innerHTML += `
    <h2>Billing Details</h2>
    <form id="checkoutForm">
      <input type="text" name="name" placeholder="Full Name" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="address" placeholder="Shipping Address" required>
      <label for="payment">Payment Method</label>
      <select id="payment" name="payment" required>
        <option value="">-- Select Payment Method --</option>
        <option value="card">💳 Credit/Debit Card</option>
        <option value="paypal">🅿️ PayPal</option>
        <option value="bank">🏦 Bank Transfer</option>
        <option value="crypto">₿ Crypto</option>
      </select>
      <button type="submit">Place Order</button>
    </form>
  `;
  document.getElementById("checkoutForm").addEventListener("submit", placeOrder);
}

function placeOrder(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value;
  const email = form.email.value;
  const address = form.address.value;
  const payment = form.payment.value;

  if (!payment) {
    alert("Please select a payment method.");
    return;
  }

  // First check if a customer is logged in
  fetch('https://gamehub-backend-a0c2.onrender.com/customer-check', { credentials: 'include' })
    .then(res => res.json())
    .then(auth => {
      const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
      
      const order = {
        items: cart,
        total: total,
        customerName: auth.authenticated ? auth.username : name,
        email: email,
        address: address,
        payment: payment
      };

      // Send order to server
      return fetch('https://gamehub-backend-a0c2.onrender.com/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(order)
      });
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem("lastOrder", JSON.stringify({
          orderId: data.orderId,
          name: name,
          email: email,
          payment: payment,
          items: cart,
          total: cart.reduce((sum, item) => sum + item.price * item.qty, 0)
        }));
        localStorage.removeItem("cart");
        window.location.href = "/confirmation.html";
      } else {
        alert("Error placing order: " + (data.error || "Unknown error"));
      }
    })
    .catch(err => {
      console.error("Order error:", err);
      alert("Failed to place order. Please try again.");
    });
}

window.onload = renderCheckout;