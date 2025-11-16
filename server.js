// server.js

const express = require('express');
const puppeteer = require('puppeteer-core');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MAX_RETRIES = 3;
const TIMEOUT = 60000; // 60 seconds

// Connect to SQLite database
let db;
async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'productData.db'),
        driver: sqlite3.Database
    });
    await db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            name TEXT,
            category TEXT,
            price INTEGER,
            date TEXT,
            image TEXT
        )
    `);
}

// Trim and normalize the URL to use as a key
function trimURL(url) {
    try {
        // Trim the URL to remove unnecessary query parameters
        const trimmedUrl = new URL(url).origin + new URL(url).pathname;
        return trimmedUrl;
    } catch (error) {
        console.error('Error trimming URL:', error);
        return null;
    }
}


// Save product data into the database
async function saveProductData(url, name, category, price, image) {
    const date = new Date().toLocaleString();
    const trimmedUrl = trimURL(url);
    await db.run(
        `INSERT INTO products (url, name, category, price, date, image) VALUES (?, ?, ?, ?, ?, ?)`,
        [trimmedUrl, name, category, price, date, image]
    );
}

// Fetch product data from the database
async function getProductData(url) {
    const trimmedUrl = trimURL(url);
    const productData = await db.all(
        `SELECT * FROM products WHERE url = ? ORDER BY date ASC`,
        [trimmedUrl]
    );
    return productData;
}

// Scrape a product URL
async function scrapeProduct(baseURL, attempt = 1) {
    const browser = await puppeteer.launch({
        executablePath: BROWSER_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.goto(baseURL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

        const finalURL = page.url(); // Get the final URL after potential redirect
        const productName = await page.$eval('h1.pdp-mod-product-badge-title', (el) => el.textContent.trim());
        const productImage = await page.$eval('div.gallery-preview-panel__content img', (el) => el.getAttribute('src'));

        // Extract categories and corresponding URLs if available
        const categories = await page.$$eval('div.sku-prop-content .sku-variable-name', elements =>
            elements.map(el => ({
                name: el.textContent.trim(),
                selector: el.getAttribute('title')
            }))
        ) || [{ name: 'default', selector: null }];

        console.log(`Scraped: ${productName} - Categories: ${categories.map(c => c.name).join(', ')}`);

        if (categories.length === 0) {
            categories.push({ name: 'default', selector: null });
        }

        for (const category of categories) {
            if (category.selector) {
                await page.click(`span[title="${category.selector}"]`);
                await page.waitForSelector('span.notranslate.pdp-price');
            }

            const productPrice = await page.$eval('span.notranslate.pdp-price', (el) => el.textContent.replace(/[^0-9]/g, '').trim());
            saveProductData(finalURL, productName, category.name, parseInt(productPrice, 10), productImage);
            console.log(`Saved data for ${productName} in category ${category.name} with price ${productPrice}`);
        }

    } catch (error) {
        console.error(`Error scraping ${baseURL} on attempt ${attempt}:`, error.message);
        if (attempt < MAX_RETRIES) {
            console.log(`Retrying ${baseURL}, attempt ${attempt + 1}`);
            await scrapeProduct(baseURL, attempt + 1);
        }
    } finally {
        await browser.close();
    }
}

// Function to scrape products sequentially
async function scrapeProductsSequentially() {
    const productURLs = JSON.parse(fs.readFileSync('productURLs.json', 'utf-8'));
    for (const url of productURLs) {
        await scrapeProduct(url);
    }
}

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define the root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to initiate scraping
app.get('/scrape', async (req, res) => {
    await scrapeProductsSequentially();
    res.send('Scraping completed.');
});

// Endpoint to get product data for drawing graph
app.get('/product', async (req, res) => {
    const url = req.query.url;
    const data = await getProductData(url);
    if (!data || data.length === 0) {
        res.status(404).send('Product data not found.');
    } else {
        res.json(data);
    }
});

// Start the server
app.listen(PORT, async () => {
    await initDB();
    console.log(`Server running on port ${PORT}`);
});
