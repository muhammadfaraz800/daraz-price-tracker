// public/app.js

document.getElementById('track-button').addEventListener('click', async () => {
    const url = document.getElementById('product-url').value;
    if (!url) return alert('Please enter a product URL.');

    document.getElementById('loading-spinner').style.display = 'block';
    const response = await fetch(`/product?url=${encodeURIComponent(url)}`);
    if (response.status === 404) {
        alert('Product data not found. Please try another URL.');
        document.getElementById('loading-spinner').style.display = 'none';
        return;
    }

    const productData = await response.json();
    document.getElementById('loading-spinner').style.display = 'none';
    displayProductInfo(productData);
});

function displayProductInfo(productData) {
    const firstEntry = productData[0];
    const productName = firstEntry.name;
    const productImage = firstEntry.image;

    document.getElementById('product-name').textContent = productName;
    document.getElementById('product-image').src = productImage;

    const categorySelector = document.getElementById('category-selector');
    categorySelector.innerHTML = ''; // Clear previous options

    const categories = [...new Set(productData.map(data => data.category))]; // Unique categories
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelector.appendChild(option);
    });

    // Automatically select and show the first category
    if (categories.length > 0) {
        categorySelector.value = categories[0];
        const filteredData = productData.filter(data => data.category === categories[0]);
        drawGraph(filteredData);
    }

    categorySelector.onchange = () => {
        const selectedCategory = categorySelector.value;
        const filteredData = productData.filter(data => data.category === selectedCategory);
        drawGraph(filteredData);
    };
}

function drawGraph(filteredData) {
    const ctx = document.getElementById('price-chart').getContext('2d');
    const labels = filteredData.map(data => new Date(data.date));
    const prices = filteredData.map(data => data.price);

    if (window.priceChart) {
        window.priceChart.destroy();
    }

    window.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price History',
                data: prices,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                },
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}
