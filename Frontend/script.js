// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    cartCountEl.innerText = count;
  }
}

async function loadGames() {
  try {
    // Use the API endpoint instead of direct JSON file
    const res = await fetch('https://gamehub-backend-a0c2.onrender.com/api/games', { 
      cache: "no-store" 
    });
    
    if (!res.ok) throw new Error("Failed to load games");
    
    const games = await res.json();
    const container = document.getElementById("gamesContainer");
    
    if (!container) return;
    
    container.innerHTML = "";
    
    if (games.length === 0) {
      container.innerHTML = '<p style="text-align:center; color: var(--text-dim);">No games available yet.</p>';
      return;
    }
    
    games.forEach(game => {
      const div = document.createElement("div");
      div.className = "game-card";
      div.innerHTML = `
        ${game.image ? `<img src="${game.image}" alt="${game.name}">` : '<div class="no-image">🎮</div>'}
        <div class="game-info">
          <h3 class="game-title">${game.name}</h3>
          <span class="game-platform">${game.category || "Uncategorized"}</span>
          <div class="game-price">$${Number(game.price).toFixed(2)}</div>
          <button class="add-to-cart-btn" onclick="addToCart(${game.id}, '${escapeString(game.name)}', ${game.price}, '${escapeString(game.image || "")}')">
            Add to Cart
          </button>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading games:", err);
    const container = document.getElementById("gamesContainer");
    if (container) {
      container.innerHTML = '<p style="text-align:center; color: #ff4444;">Could not load games. Please try again.</p>';
    }
  }
}

// Helper to escape strings for HTML attributes
function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function addToCart(id, name, price, image) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
    toast.success(`${name} quantity updated! (${existing.qty})`);
  } else {
    cart.push({ id, name, price, image, qty: 1 });
    toast.success(`${name} added to cart! 🎮`);
  }
  saveCart();
}

// Search filter
const searchInput = document.getElementById("search");
if (searchInput) {
  searchInput.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll(".game-card").forEach(div => {
      const text = div.innerText.toLowerCase();
      div.style.display = text.includes(term) ? "block" : "none";
    });
  });
}

// Category filter
const filterSelect = document.getElementById("filter");
if (filterSelect) {
  filterSelect.addEventListener("change", e => {
    const selected = e.target.value.toLowerCase();
    document.querySelectorAll(".game-card").forEach(div => {
      const platformSpan = div.querySelector(".game-platform");
      if (!platformSpan) {
        div.style.display = "block";
        return;
      }
      const category = platformSpan.innerText.toLowerCase();
      div.style.display = (selected === "all" || category.includes(selected)) ? "block" : "none";
    });
  });
}

// Initialize on page load
window.onload = () => {
  loadGames();
  updateCartCount();
};