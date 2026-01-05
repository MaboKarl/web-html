// index.js - Fixed Backend server with proper MongoDB connection
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');

// --- CONFIG ---
const app = express();
const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflict with frontend

// FIXED: Proper MongoDB Atlas URI format
const MONGO_URI = "mongodb+srv://karldminer_db_user:WAKAWAKAAYEAYE@cluster0.xntpz0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = 'InventoryDB';

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// --- DATABASE ---
let db;
let client;

async function connectDB() {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        
        // FIXED: Added proper connection options
        client = new MongoClient(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        await client.connect();
        
        // Test the connection
        await client.db("admin").command({ ping: 1 });
        
        db = client.db(DB_NAME);
        console.log('✅ Successfully connected to MongoDB Atlas');
        
        // Initialize default data if collections are empty
        await initializeData();
        
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('\nTroubleshooting steps:');
        console.error('1. Check if your IP address is whitelisted in MongoDB Atlas');
        console.error('2. Verify your password is correct (no special characters need escaping)');
        console.error('3. Ensure your cluster is running');
        console.error('4. Try updating MongoDB driver: npm install mongodb@latest');
        process.exit(1);
    }
}

async function initializeData() {
    try {
        // Check if users collection has default users
        const usersCount = await db.collection('users').countDocuments();
        if (usersCount === 0) {
            console.log('Initializing default users...');
            await db.collection('users').insertMany([
                { username: 'admin', password: 'admin123', name: 'Admin User', role: 'employee' },
                { username: 'guest', password: 'guest123', name: 'Guest User', role: 'guest' }
            ]);
            console.log('✅ Default users created');
        }

        // Check if inventory collection has items
        const inventoryCount = await db.collection('inventory').countDocuments();
        if (inventoryCount === 0) {
            console.log('Initializing default inventory...');
            await db.collection('inventory').insertMany([
                { name: 'Intel Core i9-13900K', category: 'CPU', brand: 'Intel', price: 589.99, stock: 25, description: '24-Core Desktop Processor' },
                { name: 'AMD Ryzen 9 7950X', category: 'CPU', brand: 'AMD', price: 549.99, stock: 18, description: '16-Core Desktop Processor' },
                { name: 'NVIDIA RTX 4090', category: 'GPU', brand: 'NVIDIA', price: 1599.99, stock: 12, description: '24GB GDDR6X Graphics Card' },
                { name: 'AMD Radeon RX 7900 XTX', category: 'GPU', brand: 'AMD', price: 999.99, stock: 15, description: '24GB GDDR6 Graphics Card' },
                { name: 'Corsair Vengeance DDR5 32GB', category: 'RAM', brand: 'Corsair', price: 129.99, stock: 45, description: '6000MHz CL36 Memory Kit' },
                { name: 'G.Skill Trident Z5 64GB', category: 'RAM', brand: 'G.Skill', price: 249.99, stock: 30, description: '6400MHz CL32 Memory Kit' },
                { name: 'Samsung 990 Pro 2TB', category: 'Storage', brand: 'Samsung', price: 179.99, stock: 40, description: 'NVMe M.2 SSD' },
                { name: 'WD Black SN850X 4TB', category: 'Storage', brand: 'Western Digital', price: 329.99, stock: 22, description: 'NVMe M.2 SSD' },
                { name: 'ASUS ROG Strix B650-E', category: 'Motherboard', brand: 'ASUS', price: 299.99, stock: 20, description: 'AMD AM5 ATX Motherboard' },
                { name: 'MSI MPG Z790 Carbon', category: 'Motherboard', brand: 'MSI', price: 449.99, stock: 16, description: 'Intel LGA1700 ATX Motherboard' },
                { name: 'Corsair RM1000e', category: 'PSU', brand: 'Corsair', price: 179.99, stock: 28, description: '1000W 80+ Gold Modular PSU' },
                { name: 'NZXT H7 Flow', category: 'Case', brand: 'NZXT', price: 129.99, stock: 35, description: 'Mid-Tower ATX Case' }
            ]);
            console.log('✅ Default inventory created');
        }
    } catch (err) {
        console.error('Error initializing data:', err);
    }
}

// --- ROUTES ---

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Auth routes
app.post('/auth/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existing = await db.collection('users').findOne({ username });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const newUser = { username, password, name, role: 'buyer' };
        const result = await db.collection('users').insertOne(newUser);
        
        res.json({ 
            message: 'User registered', 
            user: { 
                id: result.insertedId.toString(), 
                username, 
                name, 
                role: 'buyer' 
            } 
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }

        const user = await db.collection('users').findOne({ username, password });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        res.json({ 
            id: user._id.toString(), 
            username: user.username, 
            name: user.name, 
            role: user.role 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Inventory routes
app.get('/inventory', async (req, res) => {
    try {
        const items = await db.collection('inventory').find().toArray();
        // Convert _id to id for frontend compatibility
        const formattedItems = items.map(item => ({
            ...item,
            id: item._id.toString(),
            _id: undefined
        }));
        res.json(formattedItems);
    } catch (err) {
        console.error('Get inventory error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/inventory/add', async (req, res) => {
    try {
        const item = req.body;
        if (!item.name || !item.category || !item.price || item.stock === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await db.collection('inventory').insertOne(item);
        res.json({ message: 'Item added', itemId: result.insertedId.toString() });
    } catch (err) {
        console.error('Add item error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.put('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;
        
        await db.collection('inventory').updateOne(
            { _id: new ObjectId(id) }, 
            { $set: update }
        );
        res.json({ message: 'Item updated' });
    } catch (err) {
        console.error('Update item error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.delete('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('inventory').deleteOne({ _id: new ObjectId(id) });
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error('Delete item error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Cart routes
app.get('/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await db.collection('carts').findOne({ userId }) || { userId, items: [] };
        res.json(cart);
    } catch (err) {
        console.error('Get cart error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/cart/:userId/add', async (req, res) => {
    try {
        const { userId } = req.params;
        const { itemId, quantity } = req.body;
        
        let cart = await db.collection('carts').findOne({ userId });
        if (!cart) cart = { userId, items: [] };

        const existing = cart.items.find(i => i.itemId === itemId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.items.push({ itemId, quantity });
        }

        await db.collection('carts').updateOne(
            { userId }, 
            { $set: cart }, 
            { upsert: true }
        );
        res.json({ message: 'Item added to cart', cart });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.delete('/cart/:userId/remove/:itemId', async (req, res) => {
    try {
        const { userId, itemId } = req.params;
        const cart = await db.collection('carts').findOne({ userId });
        
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        cart.items = cart.items.filter(i => i.itemId !== itemId);
        await db.collection('carts').updateOne({ userId }, { $set: cart });
        res.json({ message: 'Item removed', cart });
    } catch (err) {
        console.error('Remove from cart error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.delete('/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await db.collection('carts').updateOne(
            { userId }, 
            { $set: { items: [] } }
        );
        res.json({ message: 'Cart cleared' });
    } catch (err) {
        console.error('Clear cart error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// --- GRACEFUL SHUTDOWN ---
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
    }
    process.exit(0);
});

// --- START SERVER ---
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Backend API server running on http://localhost:${PORT}`);
        console.log(`📊 Database: ${DB_NAME}`);
        console.log(`\nAvailable endpoints:`);
        console.log(`  - POST http://localhost:${PORT}/auth/login`);
        console.log(`  - POST http://localhost:${PORT}/auth/register`);
        console.log(`  - GET  http://localhost:${PORT}/inventory`);
        console.log(`  - GET  http://localhost:${PORT}/health`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});