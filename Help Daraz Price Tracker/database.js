// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'products.db');

let db;

// Initialize database
function initializeDB() {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Could not connect to database', err);
        } else {
            console.log('Connected to database');
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT UNIQUE,
                    name TEXT,
                    category TEXT,
                    price INTEGER,
                    image TEXT,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
    });
}

// Save product data to the database
function saveProductData(url, name, price, image, category) {
    const query = `
        INSERT INTO products (url, name, category, price, image)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(url, category) DO UPDATE SET
        name = excluded.name,
        price = excluded.price,
        image = excluded.image,
        date = CURRENT_TIMESTAMP;
    `;
    db.run(query, [url, name, category, price, image], (err) => {
        if (err) {
            console.error('Error inserting data', err.message);
        } else {
            console.log('Data saved to database');
        }
    });
}

// Get product data from the database
function getProductData(url, callback) {
    const query = `
        SELECT name, category, price, image, date
        FROM products
        WHERE url = ?
        ORDER BY date DESC
    `;
    db.all(query, [url], (err, rows) => {
        if (err) {
            console.error('Error fetching data', err.message);
            callback(err, null);
        } else {
            const data = rows.length > 0 ? rows : null;
            callback(null, data);
        }
    });
}

module.exports = { saveProductData, getProductData, initializeDB };
