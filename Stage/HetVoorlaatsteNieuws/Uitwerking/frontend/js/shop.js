const shopStatusEl = document.getElementById('shop-status');
const stripeStatusEl = document.getElementById('stripe-status');
const productsGridEl = document.getElementById('products-grid');
const featuredProductEl = document.getElementById('featured-product');

let stripeClient = null;
let stripeConfig = { enabled: false, publishableKey: '' };
let products = [];

function formatPrice(priceCents, currency = 'eur') {
    return new Intl.NumberFormat('nl-BE', {
        style: 'currency',
        currency: (currency || 'eur').toUpperCase()
    }).format((priceCents || 0) / 100);
}

function setStatus(message, kind = 'info') {
    if (!message) {
        shopStatusEl.style.display = 'none';
        shopStatusEl.textContent = '';
        shopStatusEl.className = 'cms-status';
        return;
    }
    shopStatusEl.style.display = 'block';
    shopStatusEl.textContent = message;
    shopStatusEl.className = `cms-status cms-status-${kind}`;
}

function setStripeStatus() {
    if (stripeConfig.enabled) {
        stripeStatusEl.textContent = 'Stripe checkout is actief.';
        stripeStatusEl.className = 'shop-inline-note shop-inline-note-success';
        return;
    }
    stripeStatusEl.textContent = 'Stripe is nog niet actief. Zet STRIPE_SECRET_KEY en STRIPE_PUBLISHABLE_KEY op de server om live afrekenen in te schakelen.';
    stripeStatusEl.className = 'shop-inline-note shop-inline-note-warning';
}

function getFeaturedProduct() {
    return products.find(product => product.featured) || products[0] || null;
}

function renderFeaturedProduct() {
    const product = getFeaturedProduct();
    if (!product) {
        featuredProductEl.innerHTML = '<div class="error">Geen producten beschikbaar.</div>';
        return;
    }

    featuredProductEl.innerHTML = `
        <div class="shop-featured-media">
            <img src="${resolveMediaUrl(product.image)}" alt="${product.title}">
        </div>
        <div class="shop-featured-content">
            <div class="shop-card-badge">${product.badge || 'Uitgelicht'}</div>
            <h2>${product.title}</h2>
            <p class="shop-featured-subtitle">${product.subtitle || ''}</p>
            <p class="shop-featured-description">${product.description || product.short_description || ''}</p>
            <div class="shop-featured-footer">
                <span class="shop-price">${formatPrice(product.price_cents, product.currency)}</span>
                <button class="btn-blue shop-buy-button" data-product-id="${product.id}">${product.cta_label || 'Koop nu'}</button>
            </div>
        </div>
    `;
}

function renderProducts() {
    if (!products.length) {
        productsGridEl.innerHTML = '<div class="error">Geen producten gevonden.</div>';
        return;
    }

    productsGridEl.innerHTML = products.map(product => `
        <article id="${product.id}" class="shop-card">
            <div class="shop-card-image-wrap">
                <img class="shop-card-image" src="${resolveMediaUrl(product.image)}" alt="${product.title}">
                <span class="shop-card-badge">${product.badge || product.category || 'Shop'}</span>
            </div>
            <div class="shop-card-content">
                <div class="shop-card-topline">${product.category || 'Artikel'}</div>
                <h3>${product.title}</h3>
                <p class="shop-card-subtitle">${product.subtitle || ''}</p>
                <p class="shop-card-description">${product.short_description || product.description || ''}</p>
                <div class="shop-card-footer">
                    <span class="shop-price">${formatPrice(product.price_cents, product.currency)}</span>
                    <button class="btn-blue shop-buy-button" data-product-id="${product.id}">${product.cta_label || 'Koop nu'}</button>
                </div>
            </div>
        </article>
    `).join('');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        setStatus('Product niet gevonden.', 'error');
        return;
    }

    // Use global cart instance from cart.js
    if (typeof cart !== 'undefined') {
        const result = cart.addItem(product);
        if (result === 'added') {
            setStatus(`${product.title} toegevoegd aan winkelmandje!`, 'success');
        } else {
            setStatus(`${product.title} hoeveelheid verhoogd!`, 'success');
        }
    } else {
        setStatus('Winkelmandje niet beschikbaar.', 'error');
    }
}

function handleQueryStatus() {
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    if (checkoutState === 'success') {
        setStatus('Betaling gelukt. Stripe stuurde je terug naar de shop.', 'success');
    } else if (checkoutState === 'cancelled') {
        setStatus('Betaling geannuleerd. Je kan opnieuw proberen wanneer je wil.', 'error');
    }
}

function registerEvents() {
    document.addEventListener('click', event => {
        const button = event.target.closest('.shop-buy-button');
        if (!button) {
            return;
        }
        addToCart(button.dataset.productId);
    });
}

async function loadShop() {
    handleQueryStatus();
    try {
        const [productsResponse, stripeResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/products`),
            fetch(`${API_BASE_URL}/stripe/config`)
        ]);

        if (!productsResponse.ok) {
            throw new Error('Producten konden niet geladen worden.');
        }

        products = await productsResponse.json();
        stripeConfig = stripeResponse.ok ? await stripeResponse.json() : { enabled: false, publishableKey: '' };
        if (stripeConfig.enabled && stripeConfig.publishableKey && window.Stripe) {
            stripeClient = window.Stripe(stripeConfig.publishableKey);
        }

        setStripeStatus();
        renderFeaturedProduct();
        renderProducts();

        if (window.location.hash) {
            const target = document.querySelector(window.location.hash);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    } catch (error) {
        featuredProductEl.innerHTML = '<div class="error">Fout bij laden van shop.</div>';
        productsGridEl.innerHTML = '<div class="error">Fout bij laden van shop.</div>';
        setStatus(error.message, 'error');
        setStripeStatus();
    }
}

registerEvents();
loadShop();
