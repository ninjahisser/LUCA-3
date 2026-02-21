// CMS logica voor artikelbeheer en statistieken

const API_BASE = '/api'; // Pas aan indien nodig

// Statistieken ophalen en tonen
async function loadStats() {
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = 'Statistieken laden...';
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const stats = await res.json();
        statsContainer.innerHTML = `
            <ul>
                <li>Meeste bezoekers (laatste 7 dagen): <b>${stats.mostVisited.title}</b> (${stats.mostVisited.views})</li>
                <li>Totaal aantal bezoekers: <b>${stats.totalViews}</b></li>
                <li>Meest aangeklikte artikel: <b>${stats.mostClicked.title}</b> (${stats.mostClicked.clicks})</li>
            </ul>
            <h3>Views per artikel</h3>
            <ul>
                ${stats.viewsPerArticle.map(a => `<li>${a.title}: ${a.views}</li>`).join('')}
            </ul>
        `;
    } catch (e) {
        statsContainer.innerHTML = 'Fout bij laden van statistieken.';
    }
}

// Artikels ophalen en tonen
async function loadArticles() {
    const container = document.getElementById('articles-container');
    container.innerHTML = 'Artikels laden...';
    try {
        const res = await fetch(`${API_BASE}/articles`);
        const articles = await res.json();
        container.innerHTML = articles.map(article => `
            <div class="cms-article-card">
                <h3>${article.title}</h3>
                <button onclick="editArticle('${article.id}')">Aanpassen</button>
                <button onclick="deleteArticle('${article.id}')">Verwijderen</button>
                <span>Views: ${article.views} | Clicks: ${article.clicks}</span>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = 'Fout bij laden van artikels.';
    }
}

// Artikel aanpassen
window.editArticle = function(id) {
    alert('Artikel aanpassen: ' + id);
    // Implementeer modal/form voor edit
}

// Artikel verwijderen
window.deleteArticle = async function(id) {
    if (!confirm('Weet je zeker dat je dit artikel wilt verwijderen?')) return;
    try {
        await fetch(`${API_BASE}/articles/${id}`, { method: 'DELETE' });
        loadArticles();
    } catch (e) {
        alert('Fout bij verwijderen.');
    }
}

// Nieuw artikel toevoegen
const addBtn = document.getElementById('add-article-btn');
if (addBtn) {
    addBtn.onclick = () => {
        alert('Nieuw artikel toevoegen');
        // Implementeer modal/form voor toevoegen
    };
}

// Init
loadStats();
loadArticles();
