function renderConfirmation() {
  const container = document.getElementById("confirmation");
  const order = JSON.parse(localStorage.getItem("lastOrder"));

  if (!order) {
    container.innerHTML = "<h1>No order found</h1><p><a href='/index.html'>Go back to store</a></p>";
    return;
  }

  container.innerHTML = `
    <h1>✅ Order Confirmed!</h1>
    <p>Thank you, <strong>${order.name}</strong>.</p>
    <p>Your payment method: <strong>${order.payment.toUpperCase()}</strong></p>
    <p>Total Paid: <strong>$${order.total.toFixed(2)}</strong></p>
    <p>We’ve received your order of ${order.items.length} item(s).</p>
    <button onclick="window.location.href='/index.html'">Back to Store</button>
  `;

  // Clear last order after showing
  localStorage.removeItem("lastOrder");

  startConfetti();
}

// Simple confetti animation
function startConfetti() {
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confetti = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 4,
    d: Math.random() * 0.5 + 0.5,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confetti.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, false);
      ctx.fillStyle = c.color;
      ctx.fill();
    });
    update();
  }

  function update() {
    confetti.forEach(c => {
      c.y += c.d * 4;
      if (c.y > canvas.height) {
        c.y = -10;
        c.x = Math.random() * canvas.width;
      }
    });
  }

  setInterval(draw, 20);
}

window.onload = renderConfirmation;
