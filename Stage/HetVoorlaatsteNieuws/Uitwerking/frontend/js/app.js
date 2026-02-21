class ArticleLoader {
    constructor(apiUrl = 'http://127.0.0.1:5000/api') {
        this.apiUrl = apiUrl;
    }

    async loadGroups() {
        try {
            const response = await fetch(`${this.apiUrl}/groups`);
            if (!response.ok) {
                throw new Error('Failed to load groups');
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading groups:', error);
            throw error;
        }
    }

    async loadArticleById(id) {
        try {
            const response = await fetch(`${this.apiUrl}/articles/${id}`);
            if (!response.ok) {
                throw new Error('Article not found');
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading article:', error);
            throw error;
        }
    }

    getFirstImage(article) {
        if (article.components && article.components.length > 0) {
            const imageComponent = article.components.find(c => c.type === 'image');
            return imageComponent ? imageComponent.src : null;
        }
        return null;
    }

    createGroupSection(groupName, articles) {
        const section = document.createElement('div');
        section.className = 'group-section';
        if (groupName === 'het klein nieuws') {
            section.className = 'klein-nieuws-section';
        }
        if (groupName !== 'standaard' && groupName === 'standaard') {
            const header = document.createElement('div');
            header.className = 'group-header';
            header.innerHTML = `<h2 class="group-title">${groupName.toUpperCase()}</h2>`;
            section.appendChild(header);
        } else if (groupName === 'het klein nieuws') {
            const header = document.createElement('div');
            header.className = 'klein-nieuws-header';
            header.innerHTML = `<h2>${groupName}</h2>`;
            section.appendChild(header);
        }
        const container = document.createElement('div');
        if (groupName === 'standaard') {
            container.className = 'standaard-grid';
            const rows = [];
            let i = 0;
            while (i < articles.length) {
                const article = articles[i];
                if (article.size === 'groot') {
                    // randomize left/right
                    const grootLeft = Math.random() < 0.5;
                    const row = [article];
                    i++;
                    const smalls = [];
                    for (let k = 0; k < 2 && i < articles.length; k++) {
                        if (articles[i].size === 'klein') {
                            smalls.push(articles[i]);
                            i++;
                        } else {
                            break;
                        }
                    }
                    if (grootLeft) {
                        row.push(...smalls);
                    } else {
                        row.unshift(...smalls);
                    }
                    rows.push(row);
                } else {
                    const row = [article];
                    i++;
                    while (row.length < 3 && i < articles.length && articles[i].size === 'klein') {
                        row.push(articles[i]);
                        i++;
                    }
                    rows.push(row);
                }
            }
            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                if (row.length === 2 && row.every(a => a.size === 'klein')) {
                    const prev = rows[r - 1];
                    if (prev.every(a => a.size === 'klein') && prev.length < 3) {
                        prev.push(row.shift());
                    }
                }
            }
            rows.forEach(row => {
                const rowEl = document.createElement('div');
                rowEl.className = 'standaard-row';
                if (row.length === 3 && row.some(a => a.size === 'groot')) {
                    rowEl.style.display = 'grid';
                    rowEl.style.gridTemplateColumns = '1fr 1fr';
                    rowEl.style.gap = '20px';
                    const groot = row.find(a => a.size === 'groot');
                    const smalls = row.filter(a => a.size === 'klein');
                    const grootCard = this.createArticleCard(groot);
                    grootCard.classList.add('large-item');
                    // randomize groot left/right
                    if (Math.random() < 0.5) {
                        // groot links
                        rowEl.appendChild(grootCard);
                        // klein rechts in een column
                        const smallContainer = document.createElement('div');
                        smallContainer.style.display = 'flex';
                        smallContainer.style.flexDirection = 'column';
                        smallContainer.style.gap = '20px';
                        smalls.forEach(item => {
                            const card = this.createArticleCard(item);
                            card.classList.add('small-item');
                            smallContainer.appendChild(card);
                        });
                        rowEl.appendChild(smallContainer);
                    } else {
                        // klein links
                        const smallContainer = document.createElement('div');
                        smallContainer.style.display = 'flex';
                        smallContainer.style.flexDirection = 'column';
                        smallContainer.style.gap = '20px';
                        smalls.forEach(item => {
                            const card = this.createArticleCard(item);
                            card.classList.add('small-item');
                            smallContainer.appendChild(card);
                        });
                        rowEl.appendChild(smallContainer);
                        // groot rechts
                        rowEl.appendChild(grootCard);
                    }
                } else if (row.length === 3) {
                    rowEl.style.display = 'grid';
                    rowEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    rowEl.style.gap = '20px';
                    row.forEach(item => {
                        const card = this.createArticleCard(item);
                        card.classList.add('small-item');
                        rowEl.appendChild(card);
                    });
                } else if (row.length === 2) {
                    if (row.every(a => a.size === 'klein')) {
                        rowEl.style.display = 'grid';
                        rowEl.style.gridTemplateColumns = '1fr';
                    } else {
                        rowEl.style.display = 'grid';
                        rowEl.style.gridTemplateColumns = '1fr 1fr';
                    }
                    rowEl.style.gap = '20px';
                    row.forEach(item => {
                        const card = this.createArticleCard(item);
                        if (item.size === 'groot') card.classList.add('large-item');
                        else card.classList.add('small-item');
                        rowEl.appendChild(card);
                    });
                } else {
                    rowEl.style.display = 'grid';
                    rowEl.style.gridTemplateColumns = '1fr';
                    rowEl.style.gap = '20px';
                    const card = this.createArticleCard(row[0]);
                    if (row[0].size === 'groot') card.classList.add('large-item');
                    else card.classList.add('small-item');
                    rowEl.appendChild(card);
                }
                container.appendChild(rowEl);
            });
        } else {
            let gridClass = 'group-grid-dynamic';
            if (groupName === 'featured') {
                gridClass = 'featured-grid-dynamic';
            } else if (groupName === 'het klein nieuws') {
                gridClass = 'klein-nieuws-grid-dynamic';
            }
            container.className = gridClass;
            articles.forEach((article) => {
                const card = this.createArticleCard(article);
                if (article.size === 'groot') {
                    card.classList.add('large-item');
                } else {
                    card.classList.add('small-item');
                }
                container.appendChild(card);
            });
        }
        section.appendChild(container);
        if (groupName === 'het klein nieuws') {
            const footer = document.createElement('div');
            footer.className = 'klein-nieuws-footer';
            footer.innerHTML = '<button class="btn-blue-full">BEKIJK "HET KLEIN NIEUWS"</button>';
            section.appendChild(footer);
        }
        return section;
    }

    createArticleCard(article) {
        const card = document.createElement('div');
        card.className = 'article-card';
        const imageUrl = this.getFirstImage(article);
        let categoryLabel = '';
        if (article.category && article.category.toLowerCase() !== 'standaard') {
            categoryLabel = `<div class="article-label">${article.category.toUpperCase()}</div>`;
        }
        const html = `
            <img src="${imageUrl || 'https://via.placeholder.com/800x450'}" 
                 alt="${article.title}" 
                 class="article-image"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/800x450'">
            <div class="article-overlay">
                ${categoryLabel}
                <h3 class="article-title">${article.title}</h3>
            </div>
        `;
        card.innerHTML = html;
        card.addEventListener('click', () => this.showArticleDetail(article));
        return card;
    }

    renderAllGroups(groupsData, container) {
        container.innerHTML = '';
        
        // Order: featured first, then klein nieuws, then others alphabetically
        const groupKeys = Object.keys(groupsData).sort((a, b) => {
            if (a === 'featured') return -1;
            if (b === 'featured') return 1;
            if (a === 'het klein nieuws') return -1;
            if (b === 'het klein nieuws') return 1;
            return a.localeCompare(b);
        });

        groupKeys.forEach(groupName => {
            const articles = groupsData[groupName];
            if (articles.length > 0) {
                const section = this.createGroupSection(groupName, articles);
                container.appendChild(section);
            }
        });
    }

    showArticleDetail(article) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background-color: white;
            border-radius: 0;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 40px;
        `;
        
        let componentsHtml = '';
        if (article.components && article.components.length > 0) {
            article.components.forEach(component => {
                if (component.type === 'text') {
                    componentsHtml += `<p style="margin: 15px 0; line-height: 1.6; color: #333;">${component.content || ''}</p>`;
                } else if (component.type === 'image') {
                    componentsHtml += `<img src="${component.src}" alt="Article image" style="width: 100%; margin: 20px 0; border-radius: 0;">`;
                } else if (component.type === 'video') {
                    componentsHtml += `<video controls style="width: 100%; margin: 20px 0; border-radius: 0;"><source src="${component.src}"></video>`;
                } else if (component.type === 'audio') {
                    componentsHtml += `<audio controls style="width: 100%; margin: 20px 0;"><source src="${component.src}"></audio>`;
                }
            });
        }
        
        content.innerHTML = `
            <h1 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; margin-bottom: 15px; color: #000;">${article.title}</h1>
            <div style="color: #666; margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 15px;">
                <span style="margin-right: 20px;"><strong>By:</strong> ${article.author || 'Unknown'}</span>
                <span><strong>Category:</strong> ${article.category || 'General'}</span>
            </div>
            ${componentsHtml}
        `;
        
        modal.appendChild(content);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const loader = new ArticleLoader();
    const container = document.getElementById('groupsContainer');
    const kleinContainer = document.getElementById('kleinContainer');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const heroImage = document.getElementById('heroImage');

    try {
        const groupsData = await loader.loadGroups();
        loadingEl.style.display = 'none';

        // separate out klein nieuws articles
        const kleinArticles = groupsData['het klein nieuws'] || [];

        // choose one random special group from the remaining ones (e.g. politiek)
        const specialGroups = Object.keys(groupsData).filter(g => g !== 'standaard' && g !== 'het klein nieuws');
        let chosenGroup = null;
        if (specialGroups.length > 0) {
            chosenGroup = specialGroups[Math.floor(Math.random() * specialGroups.length)];
        }

        // build merged list for everything except klein nieuws and chosenGroup
        let merged = [];
        if (groupsData['standaard']) {
            merged = [...groupsData['standaard']];
        }
        Object.keys(groupsData).forEach(groupName => {
            if (groupName === 'standaard' || groupName === 'het klein nieuws' || groupName === chosenGroup) return;
            groupsData[groupName].forEach(article => {
                const idx = Math.floor(Math.random() * (merged.length + 1));
                merged.splice(idx, 0, article);
            });
        });

        // set hero image based on the first item in the merged list (fallback to klein if empty)
        let heroSource = merged.length > 0 ? merged[0] : (kleinArticles[0] || null);
        if (heroSource) {
            const firstImage = loader.getFirstImage(heroSource);
            if (firstImage && heroImage) {
                heroImage.style.backgroundImage = `url('${firstImage}')`;
            }
        }

        // render klein nieuws separately into sidebar
        if (kleinArticles.length > 0 && kleinContainer) {
            const section = loader.createGroupSection('het klein nieuws', kleinArticles);
            kleinContainer.appendChild(section);
        }

        // render the randomly chosen special group if we picked one earlier
        if (chosenGroup) {
            const articles = groupsData[chosenGroup];
            if (articles && articles.length > 0) {
                const section = loader.createGroupSection(chosenGroup, articles);
                container.appendChild(section);
            }
        }

        // render merged content into main container
        if (merged.length > 0) {
            const section = loader.createGroupSection('standaard', merged);
            container.appendChild(section);
        }
    } catch (error) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.innerHTML = `<strong>Error loading articles:</strong> ${error.message}<br><small>Make sure the backend server is running at http://127.0.0.1:5000</small>`;
    }
});

