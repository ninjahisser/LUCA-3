

const loadingEl = document.getElementById('article-loading');
const errorEl = document.getElementById('article-error');
const contentEl = document.getElementById('article-content');

function getArticleId() {
    const pathMatch = window.location.pathname.match(/\/article\/([^/]+)$/);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function renderComponents(components) {
    return (components || []).map(component => {
        if (component.type === 'text') {
            return `<p class="article-text">${component.content || ''}</p>`;
        }
        if (component.type === 'image') {
            return `<img class="article-media" src="${component.src}" alt="${component.alt || 'Artikel afbeelding'}">`;
        }
        if (component.type === 'video') {
            return `<video class="article-media" controls><source src="${component.src}"></video>`;
        }
        if (component.type === 'audio') {
            return `<audio class="article-audio" controls><source src="${component.src}"></audio>`;
        }
        return '';
    }).join('');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

async function loadArticle() {
    const articleId = getArticleId();
    if (!articleId) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = 'Geen artikel-ID gevonden.';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/articles/${encodeURIComponent(articleId)}`);
        if (!res.ok) {
            throw new Error('Artikel niet gevonden');
        }
        const article = await res.json();
        const heroImage = (article.components || []).find(c => c.type === 'image');
        const textComponents = (article.components || []).filter(c => c.type === 'text');
        const leadText = textComponents.length > 0 ? textComponents[0].content : '';
        const bodyComponents = (article.components || []).filter((c, index) => {
            if (c.type !== 'text') return true;
            return index !== (article.components || []).findIndex(comp => comp.type === 'text');
        });
        const dateText = formatDate(article.created_at);

        contentEl.innerHTML = `
            ${heroImage ? `<div class="article-hero" style="background-image:url('${heroImage.src}')"></div>` : ''}
            <div class="article-header">
                <div class="article-meta-row">
                    ${article.category ? `<span class="article-badge">${article.category}</span>` : ''}
                    ${dateText ? `<span class="article-date">${dateText}</span>` : ''}
                </div>
                <h1 class="article-title">${article.title}</h1>
            </div>
            <div class="article-body">
                ${leadText ? `<p class="article-lead">${leadText}</p>` : ''}
                ${renderComponents(bodyComponents)}
            </div>
        `;
        if (article.size === 'tekst') {
            contentEl.classList.add('article-content-tekst');
        } else {
            contentEl.classList.remove('article-content-tekst');
        }
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
    } catch (error) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = `Fout bij laden: ${error.message}`;
    }
}

loadArticle();
