from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import queue
import threading
import time
import os
import re


def create_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)


def scroll_page(driver):
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def extract_urls(driver, url, progress_queue):
    try:
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        scroll_page(driver)

        product_urls = set()
        category_urls = set()
        pagination_urls = set()

        # Extract all links
        links = driver.find_elements(By.TAG_NAME, "a")
        for link in links:
            href = link.get_attribute('href')
            if href:
                if href.startswith("https://www.daraz.pk/products/"):
                    product_urls.add(href)
                elif href.startswith("https://www.daraz.pk"):
                    if 'catalog' in href or 'category' in href:
                        category_urls.add(href)
                    elif re.search(r'page=\d+', href):
                        pagination_urls.add(href)

        progress_queue.put(
            f"From {url}: Found {len(product_urls)} products, {len(category_urls)} categories, {len(pagination_urls)} pagination links")
        return list(product_urls), list(category_urls), list(pagination_urls)
    except Exception as e:
        progress_queue.put(f"Error processing {url}: {str(e)}")
        return [], [], []


def process_url(url, visited, to_visit, product_urls, progress_queue):
    driver = create_driver()
    try:
        new_products, new_categories, new_pages = extract_urls(driver, url, progress_queue)
        product_urls.extend(new_products)

        for category in new_categories:
            if category not in visited and category not in to_visit:
                to_visit.append(category)

        for page in new_pages:
            if page not in visited and page not in to_visit:
                to_visit.append(page)
    finally:
        driver.quit()


def save_urls(urls, counter):
    filename = f'product_urls_{counter}.json'
    with open(filename, 'w') as f:
        json.dump(urls, f, indent=2)
    return f"Saved {len(urls)} URLs to {filename}"


def save_checkpoint(visited, to_visit, counter):
    checkpoint = {
        'visited': list(visited),
        'to_visit': list(to_visit),
        'counter': counter
    }
    with open('checkpoint.json', 'w') as f:
        json.dump(checkpoint, f)


def load_checkpoint():
    if os.path.exists('checkpoint.json'):
        with open('checkpoint.json', 'r') as f:
            checkpoint = json.load(f)
        return set(checkpoint['visited']), checkpoint['to_visit'], checkpoint['counter']
    return set(), ["https://www.daraz.pk"], 1


def scrape_daraz():
    visited, to_visit, counter = load_checkpoint()
    progress_queue = queue.Queue()
    product_urls = []

    # Start the progress printer thread
    progress_thread = threading.Thread(target=progress_printer, args=(progress_queue,))
    progress_thread.start()

    try:
        while to_visit:
            batch = to_visit[:5]
            to_visit = to_visit[5:]

            progress_queue.put(f"Processing batch of {len(batch)} URLs")

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(process_url, url, visited, to_visit, product_urls, progress_queue) for url in
                           batch]
                for future in as_completed(futures):
                    future.result()

            visited.update(batch)

            if len(product_urls) >= 100:
                result = save_urls(product_urls, counter)
                progress_queue.put(result)
                counter += 1
                product_urls = []

            save_checkpoint(visited, to_visit, counter)
            progress_queue.put(f"Checkpoint saved. Visited: {len(visited)}, To visit: {len(to_visit)}")

    except Exception as e:
        progress_queue.put(f"Unexpected error occurred: {str(e)}")
    finally:
        if product_urls:
            save_urls(product_urls, counter)
        save_checkpoint(visited, to_visit, counter)
        progress_queue.put("Final checkpoint saved")
        progress_queue.put(None)
        progress_thread.join()

    print("Scraping completed.")


def progress_printer(progress_queue):
    while True:
        message = progress_queue.get()
        if message is None:
            break
        print(message)
        progress_queue.task_done()


if __name__ == "__main__":
    scrape_daraz()