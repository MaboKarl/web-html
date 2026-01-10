// cart.js - Shopping cart functions
// API_URL is defined in state.js

async function addToCart(itemId, quantity) {
    if (!STATE.currentUser) {
        alert('Please log in first');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/cart/${STATE.currentUser.id}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, quantity })
        });

        if (!res.ok) {
            throw new Error('Failed to add to cart');
        }

        const data = await res.json();
        
        // Update local cart state
        const existing = STATE.cart.find(i => i.itemId === itemId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            STATE.cart.push({ itemId, quantity });
        }

        console.log('✅ Added to cart:', itemId, 'qty:', quantity);
        return true;
    } catch (err) {
        console.error('Error adding to cart:', err);
        alert('Failed to add to cart');
        return false;
    }
}

async function loadCart() {
    if (!STATE.currentUser) return;

    try {
        const res = await fetch(`${API_URL}/cart/${STATE.currentUser.id}`);
        const data = await res.json();
        STATE.cart = data.items || [];
        console.log('✅ Cart loaded:', STATE.cart.length, 'items');
    } catch (err) {
        console.error('Error loading cart:', err);
    }
}

async function removeFromCart(itemId) {
    if (!STATE.currentUser) return;

    try {
        await fetch(`${API_URL}/cart/${STATE.currentUser.id}/remove/${itemId}`, {
            method: 'DELETE'
        });
        STATE.cart = STATE.cart.filter(i => i.itemId !== itemId);
        console.log('✅ Removed from cart:', itemId);
    } catch (err) {
        console.error('Error removing from cart:', err);
    }
}

async function checkoutCart() {
    if (!STATE.currentUser || STATE.cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    try {
        // Update inventory stock for each item
        for (const cartItem of STATE.cart) {
            const item = STATE.inventory.find(i => i.id === cartItem.itemId);
            if (!item) continue;

            const newStock = item.stock - cartItem.quantity;
            await fetch(`${API_URL}/inventory/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
            });
        }

        // Clear cart
        await fetch(`${API_URL}/cart/${STATE.currentUser.id}`, {
            method: 'DELETE'
        });

        STATE.cart = [];
        await loadInventory();
        console.log('✅ Checkout successful');
        alert('Order placed successfully!');
        return true;
    } catch (err) {
        console.error('Checkout error:', err);
        alert('Checkout failed');
        return false;
    }
}