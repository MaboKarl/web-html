require('dotenv').config();
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'InventoryDB';
const BCRYPT_ROUNDS = 10;

async function hashPasswords() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        
        const users = await db.collection('users').find({}).toArray();
        
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
            await db.collection('users').updateOne(
                { _id: user._id },
                { $set: { password: hashedPassword } }
            );
            console.log(`Hashed password for: ${user.username}`);
        }
        
        console.log('All passwords hashed!');
    } finally {
        await client.close();
    }
}

hashPasswords();