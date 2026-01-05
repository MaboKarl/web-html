// state.js - Updated to load from backend instead of localStorage
const API_URL = 'http://localhost:3001'; // Backend API port

const STATE = {
    currentUser: null,
    inventory: [],
    cart: []
};

// Load inventory from backend
async function loadInventory() {
    try {
        const res = await fetch(`${API_URL}/inventory`);
        if (res.ok) {
            STATE.inventory = await res.json();
            console.log('✅ Inventory loaded from backend:', STATE.inventory.length, 'items');
        } else {
            console.error('Failed to load inventory');
        }
    } catch (err) {
        console.error('Error loading inventory:', err);
        console.warn('Make sure backend server is running on port 3001');
    }
}

// Load cart from backend
async function loadCart() {
    if (!STATE.currentUser) return;
    try {
        const res = await fetch(`${API_URL}/cart/${STATE.currentUser.id}`);
        if (res.ok) {
            const data = await res.json();
            STATE.cart = data.items || [];
            console.log('✅ Cart loaded:', STATE.cart.length, 'items');
        }
    } catch (err) {
        console.error('Error loading cart:', err);
    }
}

function findItemById(id) {
    return STATE.inventory.find(i => i.id === id);
}

// Initialize - load inventory immediately
loadInventory();