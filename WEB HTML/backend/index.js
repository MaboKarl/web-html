// Step 1: Install dotenv
// npm install dotenv

// Step 2: Create a .env file in your backend folder with:
/*
MONGO_URI=mongodb+srv://liaoadrianmiguel_db_user:adrian123@cluster0.xntpz0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=InventoryDB
PORT=3001
NODE_ENV=development
BCRYPT_ROUNDS=10
*/

// Step 3: Create a .env.example file (for sharing without secrets):
/*
MONGO_URI=your_mongo_connection_string_here
DB_NAME=InventoryDB
PORT=3001
NODE_ENV=development
BCRYPT_ROUNDS=10
*/

// Step 4: Add .env to .gitignore (so secrets aren't committed)
/*
.env
.env.local
node_modules/
*/

// ============================================
// index.js - Updated with Environment Variables
// ============================================

require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

// --- CONFIG FROM ENVIRONMENT ---
const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'InventoryDB';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not set in .env file');
    process.exit(1);
}

console.log(`📝 Environment: ${NODE_ENV}`);

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// --- DATABASE ---
let db;
let client;

async function connectDB() {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        
        client = new MongoClient(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        await client.connect();
        
        await client.db("admin").command({ ping: 1 });
        
        db = client.db(DB_NAME);
        console.log('✅ Successfully connected to MongoDB Atlas');
        
        await initializeData();
        
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('\nTroubleshooting steps:');
        console.error('1. Check if your IP address is whitelisted in MongoDB Atlas');
        console.error('2. Verify your MONGO_URI in .env is correct');
        console.error('3. Ensure your cluster is running');
        console.error('4. Try updating MongoDB driver: npm install mongodb@latest');
        process.exit(1);
    }
}

async function initializeData() {
    try {
        // Check if admin user exists
        const adminExists = await db.collection('users').findOne({ username: 'admin' });
        
        if (!adminExists) {
            console.log('Initializing default users with hashed passwords...');
            
            // Hash default passwords
            const adminPasswordHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
            const guestPasswordHash = await bcrypt.hash('guest123', BCRYPT_ROUNDS);
            
            await db.collection('users').insertMany([
                { username: 'admin', password: adminPasswordHash, name: 'Admin User', role: 'employee', createdAt: new Date() },
                { username: 'guest', password: guestPasswordHash, name: 'Guest User', role: 'guest', createdAt: new Date() }
            ]);
            console.log('✅ Default users created with hashed passwords');
        } else {
            console.log('✅ Default users already exist');
        }

        const inventoryCount = await db.collection('inventory').countDocuments();
        if (inventoryCount === 0) {
            console.log('Initializing default inventory with PHP prices...');
            await db.collection('inventory').insertMany([
                { name: 'Intel Core i9-13900K', category: 'CPU', brand: 'Intel', price: 33000, stock: 25, description: '24-Core Desktop Processor' },
                { name: 'AMD Ryzen 9 7950X', category: 'CPU', brand: 'AMD', price: 31000, stock: 18, description: '16-Core Desktop Processor' },
                { name: 'NVIDIA RTX 4090', category: 'GPU', brand: 'NVIDIA', price: 90000, stock: 12, description: '24GB GDDR6X Graphics Card' },
                { name: 'AMD Radeon RX 7900 XTX', category: 'GPU', brand: 'AMD', price: 56000, stock: 15, description: '24GB GDDR6 Graphics Card' },
                { name: 'Corsair Vengeance DDR5 32GB', category: 'RAM', brand: 'Corsair', price: 7300, stock: 45, description: '6000MHz CL36 Memory Kit' },
                { name: 'G.Skill Trident Z5 64GB', category: 'RAM', brand: 'G.Skill', price: 14000, stock: 30, description: '6400MHz CL32 Memory Kit' },
                { name: 'Samsung 990 Pro 2TB', category: 'Storage', brand: 'Samsung', price: 10000, stock: 40, description: 'NVMe M.2 SSD' },
                { name: 'WD Black SN850X 4TB', category: 'Storage', brand: 'Western Digital', price: 18500, stock: 22, description: 'NVMe M.2 SSD' },
                { name: 'ASUS ROG Strix B650-E', category: 'Motherboard', brand: 'ASUS', price: 16800, stock: 20, description: 'AMD AM5 ATX Motherboard' },
                { name: 'MSI MPG Z790 Carbon', category: 'Motherboard', brand: 'MSI', price: 25200, stock: 16, description: 'Intel LGA1700 ATX Motherboard' },
                { name: 'Corsair RM1000e', category: 'PSU', brand: 'Corsair', price: 10100, stock: 28, description: '1000W 80+ Gold Modular PSU' },
                { name: 'NZXT H7 Flow', category: 'Case', brand: 'NZXT', price: 7300, stock: 35, description: 'Mid-Tower ATX Case' }
            ]);
            console.log('✅ Default inventory created with PHP prices');
        }
    } catch (err) {
        console.error('Error initializing data:', err);
    }
}

// --- ROUTES ---

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running', environment: NODE_ENV });
});

// Auth routes
app.post('/auth/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        // Input validation
        if (!username || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        const existing = await db.collection('users').findOne({ username });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        
        const newUser = { 
            username, 
            password: hashedPassword, 
            name, 
            role: 'buyer',
            createdAt: new Date()
        };
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
        
        // Input validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }

        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Compare password with hash
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
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
        
        // Input validation
        if (!item.name || !item.category || !item.price || item.stock === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (item.price < 0 || item.stock < 0) {
            return res.status(400).json({ error: 'Price and stock cannot be negative' });
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
        
        // Input validation
        if (update.price && update.price < 0) {
            return res.status(400).json({ error: 'Price cannot be negative' });
        }
        
        if (update.stock !== undefined && update.stock < 0) {
            update.stock = 0;
        }
        
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
        
        // Input validation
        if (!itemId || !quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid item or quantity' });
        }
        
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

// --- ORDER ROUTES ---

app.post('/checkout/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let totalAmount = 0;
        const orderItems = [];

        for (const cartItem of items) {
            const product = await db.collection('inventory').findOne({ _id: new ObjectId(cartItem.itemId) });
            if (!product) {
                return res.status(404).json({ error: 'Product not found: ' + cartItem.itemId });
            }

            if (product.stock < cartItem.quantity) {
                return res.status(400).json({ error: 'Insufficient stock for ' + product.name });
            }

            const subtotal = product.price * cartItem.quantity;
            totalAmount += subtotal;

            orderItems.push({
                itemId: cartItem.itemId,
                name: product.name,
                category: product.category,
                price: product.price,
                quantity: cartItem.quantity,
                subtotal: subtotal
            });

            await db.collection('inventory').updateOne(
                { _id: new ObjectId(cartItem.itemId) },
                { $set: { stock: product.stock - cartItem.quantity } }
            );
        }

        const now = new Date();
        const order = {
            userId: userId,
            username: user.username,
            items: orderItems,
            totalAmount: totalAmount,
            status: 'completed',
            orderDate: now,
            deliveryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
        };

        const result = await db.collection('orders').insertOne(order);

        await db.collection('carts').updateOne(
            { userId },
            { $set: { items: [] } }
        );

        res.json({
            message: 'Order placed successfully',
            orderId: result.insertedId.toString(),
            order: order
        });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get('/orders/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const orders = await db.collection('orders')
            .find({ userId })
            .sort({ orderDate: -1 })
            .toArray();

        res.json(orders);
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get('/analytics', async (req, res) => {
    try {
        const revenueData = await db.collection('orders').aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 },
                    averageOrder: { $avg: '$totalAmount' }
                }
            }
        ]).toArray();

        const bestsellers = await db.collection('orders').aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]).toArray();

        const salesByCategory = await db.collection('orders').aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.category',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { revenue: -1 } }
        ]).toArray();

        const monthlySales = await db.collection('orders').aggregate([
            {
                $addFields: {
                    orderDateConverted: { $toDate: '$orderDate' }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$orderDateConverted' },
                        month: { $month: '$orderDateConverted' }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]).toArray();

        res.json({
            overview: revenueData[0] || { totalRevenue: 0, totalOrders: 0, averageOrder: 0 },
            bestsellers,
            salesByCategory,
            monthlySales
        });
    } catch (err) {
        console.error('Analytics error:', err);
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
        console.log(`🔐 Password Hashing: Enabled (bcrypt, ${BCRYPT_ROUNDS} rounds)`);
        console.log(`🔑 Secrets: Using .env file`);
        console.log(`📝 Environment: ${NODE_ENV}`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});