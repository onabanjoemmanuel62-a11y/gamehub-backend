// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById("cart-count").innerText = count;
}

async function loadGames() {
  try {
    const res = await fetch('https://gamehub-backend-a0c2.onrender.com/games.json', { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load games.json");
    const games = await res.json();

    const container = document.getElementById("gamesContainer");
    container.innerHTML = "";

    games.forEach(game => {
      const div = document.createElement("div");
      div.className = "game-card";
      div.innerHTML = `
        ${game.image ? `<img src="${game.image}" alt="${game.name}">` : ""}
        <h3>${game.name}</h3>
        <div class="price">
          <span class="current">$${Number(game.price).toFixed(2)}</span>
          ${game.rrp ? `<span class="rrp">$${Number(game.rrp).toFixed(2)}</span>` : ""}
        </div>
        <p class="category">${game.category || "Uncategorized"}</p>
        <button onclick="addToCart(${game.id}, '${game.name.replace(/'/g,"\\'")}', ${game.price}, '${game.image || ""}')">Add to Cart</button>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading games:", err);
    document.getElementById("gamesContainer").innerHTML =
      `<p style="text-align:center;">Could not load games.</p>`;
  }
}

function addToCart(id, name, price, image) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, image, qty: 1 });
  }
  saveCart();
  alert(`${name} added to cart!`);
}

// Search filter
document.getElementById("search").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".game-card").forEach(div => {
    div.style.display = div.innerText.toLowerCase().includes(term) ? "block" : "none";
  });
});

// Category filter
document.getElementById("filter").addEventListener("change", e => {
  const selected = e.target.value.toLowerCase();
  document.querySelectorAll(".game-card").forEach(div => {
    const category = div.querySelector(".category").innerText.toLowerCase();
    div.style.display = (selected === "all" || category === selected) ? "block" : "none";
  });
});

window.onload = () => {
  loadGames();
  updateCartCount();
};
