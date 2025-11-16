// server.js

const express = require('express');
const puppeteer = require('puppeteer-core');
const { saveProductData, getProductData } = require('./database');
const fs = require('fs');

const app = express();
const PORT = 3000;
const BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Middleware to serve static files
app.use(express.static('public'));

// Read product URLs from JSON file
const productURLs = JSON.parse(fs.readFileSync('productURLs.json', 'utf-8'));

// Function to scrape a product URL
async function scrapeProduct(url) {
    const browser = await puppeteer.launch({
        executablePath: BROWSER_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const productName = await page.$eval(
            'h1.pdp-mod-product-badge-title',
            (el) => el.textContent.trim()
        );
        const productPrice = await page.$eval(
            'span.notranslate.pdp-price',
            (el) => el.textContent.replace(/[^0-9]/g, '').trim()
        );

        console.log(`Scraped: ${productName} - Rs. ${productPrice}`);

        // Save to database
        saveProductData(url, productName, parseInt(productPrice, 10));

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
    } finally {
        await browser.close();
    }
}

// Scrape multiple URLs concurrently
function scrapeProductsConcurrently() {
    let index = 0;

    function scrapeBatch() {
        const batch = productURLs.slice(index, index + 5);
        index += 5;

        return Promise.all(batch.map(scrapeProduct)).then(() => {
            if (index < productURLs.length) {
                return scrapeBatch();
            }
        });
    }

    return scrapeBatch();
}

// Endpoint to initiate scraping
app.get('/scrape', (req, res) => {
    scrapeProductsConcurrently().then(() => {
        res.send('Scraping completed.');
    }).catch((error) => {
        res.status(500).send('Error during scraping: ' + error.message);
    });
});

// Endpoint to get product data for drawing graph
app.get('/product', (req, res) => {
    const url = req.query.url;
    getProductData(url, (err, data) => {
        if (err || !data) {
            res.status(404).send('Product data not found.');
            return;
        }
        res.json(data);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
