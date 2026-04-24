# Daraz Price Tracker

This project is a web scraper designed to track the prices of products on Daraz, a popular e-commerce platform. It automatically scrapes product information, including name, price, and image, and stores it in a SQLite database. This allows you to monitor price changes over time.

## Features

- **Automated Scraping**: The scraper runs automatically to fetch the latest product data.
- **Price Tracking**: All scraped data is stored in a database, allowing you to track price history.
- **Customizable**: You can easily configure the list of products to track by editing the `productURLs.json` file.
- **Web Interface**: The project includes a simple web interface to view the scraped data.

## Installation

1. **Clone the repository**:
   ```bash
   https://github.com/muhammadfaraz800/daraz-price-tracker.git
   cd daraz-price-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the browser path**:
   - Open `server.js` and `multiple url scrape.server.js`.
   - Find the `BROWSER_PATH` constant and update it with the path to your Chrome or Chromium executable.

## Usage

1. **Add product URLs**:
   - Open the `productURLs.json` file.
   - Add the URLs of the Daraz products you want to track.

2. **Start the server**:
   - You can use either `server.js` or `multiple url scrape.server.js`.
   - To use `server.js`:
     ```bash
     node server.js
     ```
   - To use `multiple url scrape.server.js`:
     ```bash
     node "multiple url scrape.server.js"
     ```

3. **Scrape data**:
   - Open your browser and go to `http://localhost:3000/scrape`.
   - This will start the scraping process, which may take a few minutes to complete.

4. **View data**:
   - To view the data for a specific product, go to `http://localhost:3000/product?url=<product-url>`.

## Configuration

- **`productURLs.json`**: This file contains the list of product URLs to be scraped. You can add or remove URLs as needed.
- **`BROWSER_PATH`**: This constant in `server.js` and `multiple url scrape.server.js` specifies the path to your browser's executable. Make sure this is correctly configured for your system.
## not ready to use project... suggestions are needed 
