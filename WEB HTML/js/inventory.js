// inventory.js - Uses API_URL from state.js

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
        
        // Reload inventory from backend
        await loadInventory();
        
        f.reset();
        document.getElementById('addModal').classList.add('hidden');
        renderInventoryTable();
        
        alert('Item added successfully!');
    } catch (err) {
        alert('Failed to add item. Check if backend is running.');
        console.error(err);
    }
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
        
        // Update local state
        STATE.inventory = STATE.inventory.map(i => 
            i.id === id ? { ...i, ...updatedItem } : i
        );
        
        document.getElementById('editModal').classList.add('hidden');
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
        
        STATE.inventory = STATE.inventory.filter(i => i.id !== id);
        renderInventoryTable();
        
        alert('Item deleted successfully!');
    } catch (err) {
        alert('Failed to delete item. Check if backend is running.');
        console.error(err);
    }
}