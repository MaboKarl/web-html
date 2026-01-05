// cart.js - Updated with correct API URL
const API_URL = 'http://localhost:3001';

async function loadCart() {
    if (!STATE.currentUser) return;
    try {
        const res = await fetch(`${API_URL}/cart/${STATE.currentUser.id}`);
        const data = await res.json();
        STATE.cart = data.items || [];
        renderCartPreview();
        updateCartCount();
    } catch (err) {
        console.error('Error loading cart:', err);
    }
}

async function confirmAddToCartFromModal() {
    const modal = document.getElementById('addToCartModal');
    const id = modal.dataset.itemId;
    const qty = parseInt(modal.querySelector('#addQty').value) || 1;

    try {
        const res = await fetch(`${API_URL}/cart/${STATE.currentUser.id}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: id, quantity: qty })
        });
        const data = await res.json();
        STATE.cart = data.cart.items;
        modal.classList.add('hidden');
        alert('Added to cart');
        renderCartPreview();
        updateCartCount();
    } catch (err) {
        alert('Failed to add to cart');
        console.error(err);
    }
}

async function checkoutCart() {
    if (STATE.cart.length === 0) return alert('Cart is empty');

    try {
        // Update inventory on backend for each cart item
        for (const c of STATE.cart) {
            const item = STATE.inventory.find(i => i.id === c.itemId);
            if (!item || item.stock < c.quantity) {
                return alert('Insufficient stock for ' + (item ? item.name : 'item'));
            }
            const newStock = item.stock - c.quantity;
            
            await fetch(`${API_URL}/inventory/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
            });
            item.stock = newStock;
        }

        // Clear cart on backend
        await fetch(`${API_URL}/cart/${STATE.currentUser.id}`, { 
            method: 'DELETE' 
        });
        
        STATE.cart = [];
        document.getElementById('cartModal')?.classList.add('hidden');
        
        // Reload inventory to reflect new stock
        await loadInventory();
        renderProductsGrid();
        renderCartPreview();
        updateCartCount();
        
        alert('Order placed successfully!');
    } catch (err) {
        alert('Checkout failed. Please try again.');
        console.error(err);
    }
}

function updateCartCount() {
    const countEl = document.getElementById('cartCount');
    if (countEl) {
        countEl.textContent = STATE.cart.reduce((s, i) => s + i.quantity, 0);
    }
}