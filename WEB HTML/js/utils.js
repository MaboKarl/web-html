// utils.js - Complete version with all utility functions

async function loadCurrentUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) STATE.currentUser = JSON.parse(saved);
    if (STATE.currentUser) await loadCart();
}

function redirectByRole(role) {
    const pages = {
        'buyer': '/Frontend/buyer.html',
        'employee': '/Frontend/employee.html',
        'guest': '/Frontend/guest.html'
    };
    window.location.href = pages[role] || '/Frontend/index.html';
}

function showLoginError(msg) {
    const errorDiv = document.getElementById('loginError') || document.getElementById('registerError');
    if (errorDiv) {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    } else {
        alert(msg);
    }
}

function handleLogout() {
    STATE.currentUser = null;
    STATE.cart = [];
    localStorage.removeItem('currentUser');
    localStorage.removeItem('cart');
    window.location.href = '/Frontend/index.html';
}

function filterItems() {
    const searchText = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const category = document.getElementById('categoryFilter')?.value || 'All';
    
    return STATE.inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchText) || 
                            item.brand.toLowerCase().includes(searchText);
        const matchesCategory = category === 'All' || item.category === category;
        return matchesSearch && matchesCategory;
    });
}

// Product Grid Rendering (for buyer and guest)
function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    const noItems = document.getElementById('noItems');
    if (!grid) return;

    const filtered = filterItems();
    
    if (filtered.length === 0) {
        grid.classList.add('hidden');
        noItems?.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    noItems?.classList.add('hidden');

    grid.innerHTML = filtered.map(item => `
        <div class="product-card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem;">
                <span class="badge badge-primary">${item.category}</span>
                <span class="badge ${item.stock < 10 ? 'badge-danger' : 'badge-success'}">
                    ${item.stock} in stock
                </span>
            </div>
            <h3>${item.name}</h3>
            <p style="color:#6b7280;font-size:0.875rem;margin-bottom:0.5rem;">${item.brand}</p>
            <p class="line-clamp-2" style="color:#4b5563;margin-bottom:1rem;">${item.description}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:1.5rem;font-weight:700;color:#4f46e5;">$${item.price.toFixed(2)}</span>
                ${STATE.currentUser?.role === 'buyer' ? `
                    <button class="btn-primary" onclick="openAddToCartModal('${item.id}')" 
                        ${item.stock === 0 ? 'disabled' : ''}>
                        Add to Cart
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Inventory Table Rendering (for employee)
function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTbody');
    if (!tbody) return;

    const filtered = filterItems();
    
    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td>${item.name}</td>
            <td><span class="badge badge-primary">${item.category}</span></td>
            <td>${item.brand}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td><span class="badge ${item.stock < 10 ? 'badge-danger' : 'badge-success'}">${item.stock}</span></td>
            <td>
                <button class="btn-icon" onclick="openEditForm('${item.id}')" title="Edit">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button class="btn-icon" onclick="confirmDelete('${item.id}')" title="Delete">
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAddForm() {
    document.getElementById('addForm')?.reset();
    document.getElementById('addModal')?.classList.remove('hidden');
}

async function handleAddSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const newItem = {
        name: f.name.value,
        category: f.category.value,
        brand: f.brand.value,
        price: parseFloat(f.price.value),
        stock: parseInt(f.stock.value),
        description: f.description.value
    };
    
    try {
        const res = await fetch(`${API_URL}/inventory/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        });
        const data = await res.json();
        
        if (!res.ok) {
            alert('Failed to add item: ' + (data.error || 'Unknown error'));
            return;
        }
        
        await loadInventory();
        f.reset();
        document.getElementById('addModal')?.classList.add('hidden');
        renderInventoryTable();
        alert('Item added successfully!');
    } catch (err) {
        alert('Failed to add item. Check if backend is running.');
        console.error(err);
    }
}

function openEditForm(id) {
    const item = STATE.inventory.find(i => i.id === id);
    if (!item) return;

    const form = document.getElementById('editForm');
    if (!form) return;

    form.id.value = item.id;
    form.name.value = item.name;
    form.category.value = item.category;
    form.brand.value = item.brand;
    form.price.value = item.price;
    form.stock.value = item.stock;
    form.description.value = item.description;

    document.getElementById('editModal')?.classList.remove('hidden');
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const id = f.id.value;
    const updatedItem = {
        name: f.name.value,
        category: f.category.value,
        brand: f.brand.value,
        price: parseFloat(f.price.value),
        stock: parseInt(f.stock.value),
        description: f.description.value
    };
    
    try {
        const res = await fetch(`${API_URL}/inventory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem)
        });
        
        if (!res.ok) {
            alert('Failed to update item');
            return;
        }
        
        await loadInventory();
        document.getElementById('editModal')?.classList.add('hidden');
        renderInventoryTable();
        alert('Item updated successfully!');
    } catch (err) {
        alert('Failed to update item. Check if backend is running.');
        console.error(err);
    }
}

async function confirmDelete(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const res = await fetch(`${API_URL}/inventory/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!res.ok) {
            alert('Failed to delete item');
            return;
        }
        
        await loadInventory();
        renderInventoryTable();
        alert('Item deleted successfully!');
    } catch (err) {
        alert('Failed to delete item. Check if backend is running.');
        console.error(err);
    }
}

function openAddToCartModal(itemId) {
    const item = STATE.inventory.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('addToCartModal');
    if (!modal) return;

    modal.dataset.itemId = itemId;
    modal.querySelector('.modal-title').textContent = item.name;
    modal.querySelector('.modal-price').textContent = `$${item.price.toFixed(2)} - ${item.stock} available`;
    modal.querySelector('#addQty').value = 1;
    modal.querySelector('#addQty').max = item.stock;
    modal.classList.remove('hidden');
}

function renderCartPreview() {
    const preview = document.getElementById('cartPreview');
    if (!preview) return;

    if (STATE.cart.length === 0) {
        preview.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">Your cart is empty</p>';
        return;
    }

    let total = 0;
    preview.innerHTML = STATE.cart.map(cartItem => {
        const item = STATE.inventory.find(i => i.id === cartItem.itemId);
        if (!item) return '';
        const subtotal = item.price * cartItem.quantity;
        total += subtotal;
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border-bottom:1px solid #e5e7eb;">
                <div style="flex:1;">
                    <p style="font-weight:600;">${item.name}</p>
                    <p style="color:#6b7280;font-size:0.875rem;">$${item.price.toFixed(2)} × ${cartItem.quantity}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-weight:600;color:#4f46e5;">$${subtotal.toFixed(2)}</p>
                    <button class="btn-icon" onclick="removeFromCart('${item.id}')" title="Remove">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('') + `
        <div style="margin-top:1rem;padding-top:1rem;border-top:2px solid #e5e7eb;">
            <div style="display:flex;justify-content:space-between;font-size:1.25rem;font-weight:700;">
                <span>Total:</span>
                <span style="color:#4f46e5;">$${total.toFixed(2)}</span>
            </div>
        </div>
    `;
}

async function removeFromCart(itemId) {
    if (!STATE.currentUser) return;
    try {
        await fetch(`${API_URL}/cart/${STATE.currentUser.id}/remove/${itemId}`, {
            method: 'DELETE'
        });
        STATE.cart = STATE.cart.filter(i => i.itemId !== itemId);
        renderCartPreview();
        await loadInventory();
        renderProductsGrid();
    } catch (err) {
        console.error(err);
    }
}