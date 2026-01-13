// cart.js - Shopping cart functions
// API_URL is defined in state.js

async function addToCart(itemId, quantity) {
    if (!STATE.currentUser) {
        alert('Please log in first');
        return;
    }

    // Find the item in inventory
    const item = STATE.inventory.find(i => i.id === itemId);
    
    // Check if item exists
    if (!item) {
        alert('Item not found');
        return;
    }

    // Check if out of stock
    if (item.stock === 0) {
        alert('This item is out of stock');
        return;
    }

    // Check if enough stock for requested quantity
    if (item.stock < quantity) {
        alert('Not enough stock available! Only ' + item.stock + ' left.');
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
        alert('Added to cart successfully!');
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
        // Validate all items have enough stock before checkout
        for (const cartItem of STATE.cart) {
            const item = STATE.inventory.find(i => i.id === cartItem.itemId);
            if (!item) {
                alert('Item not found: ' + cartItem.itemId);
                return;
            }
            if (item.stock < cartItem.quantity) {
                alert('Not enough stock for ' + item.name + '. Available: ' + item.stock);
                return;
            }
        }

        // Update inventory stock for each item
        for (const cartItem of STATE.cart) {
            const item = STATE.inventory.find(i => i.id === cartItem.itemId);
            if (!item) continue;

            const newStock = Math.max(0, item.stock - cartItem.quantity);
            await fetch(`${API_URL}/inventory/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
            });
            item.stock = newStock;
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