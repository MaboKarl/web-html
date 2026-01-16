// cart.js - Shopping cart functions with backend checkout
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
        const res = await fetch(`${API_URL}/cart/${STATE.currentUser.id}/remove/${itemId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error('Failed to remove from cart');
        }

        STATE.cart = STATE.cart.filter(i => i.itemId !== itemId);
        console.log('✅ Removed from cart:', itemId);
        return true;
    } catch (err) {
        console.error('Error removing from cart:', err);
        alert('Failed to remove item');
        return false;
    }
}

async function checkoutCart() {
    if (!STATE.currentUser || STATE.cart.length === 0) {
        alert('Cart is empty');
        return false;
    }

    try {
        // Prepare cart items for checkout
        const checkoutItems = STATE.cart.map(cartItem => ({
            itemId: cartItem.itemId,
            quantity: cartItem.quantity
        }));

        // Call backend checkout endpoint
        const res = await fetch(`${API_URL}/checkout/${STATE.currentUser.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: checkoutItems })
        });

        if (!res.ok) {
            const error = await res.json();
            alert('Checkout failed: ' + (error.error || 'Unknown error'));
            return false;
        }

        const data = await res.json();
        
        // Clear local cart
        STATE.cart = [];
        
        // Reload inventory to show updated stock
        await loadInventory();
        
        console.log('✅ Checkout successful. Order ID:', data.orderId);
        alert('Order placed successfully!\nOrder ID: ' + data.orderId);
        return true;
    } catch (err) {
        console.error('Checkout error:', err);
        alert('Checkout failed: ' + err.message);
        return false;
    }
}