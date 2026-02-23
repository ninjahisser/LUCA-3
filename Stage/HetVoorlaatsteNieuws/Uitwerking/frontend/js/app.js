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

    findFirstArticleWithImage(groupsData) {
        const allArticles = Object.values(groupsData || {}).flat();
        for (const article of allArticles) {
            if (this.getFirstImage(article)) {
                return article;
            }
        }
        return allArticles[0] || null;
    }

    findLatestArticleWithImage(groupsData) {
        const allArticles = Object.values(groupsData || {}).flat();
        const sorted = allArticles.slice().sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return bTime - aTime;
        });
        for (const article of sorted) {
            if (this.getFirstImage(article)) {
                return article;
            }
        }
        return sorted[0] || null;
    }

    findFirstImageFromGroups(groupsData) {
        const allArticles = Object.values(groupsData || {}).flat();
        for (const article of allArticles) {
            const image = this.getFirstImage(article);
            if (image) {
                return image;
            }
        }
        return null;
    }

    createGroupSection(groupName, articles) {
        const section = document.createElement('div');
        section.className = 'group-section';
        const isLargeSize = (size) => size === 'groot' || size === 'tekst';
        const isSmallSize = (size) => size === 'klein';
        const isKleinStyleGroup = groupName === 'het klein nieuws' || groupName === 'de miniatuurwereld';
        if (isKleinStyleGroup) {
            section.className = 'klein-nieuws-section';
        }
        if (groupName !== 'standaard' && groupName === 'standaard') {
            const header = document.createElement('div');
            header.className = 'group-header';
            header.innerHTML = `<h2 class="group-title">${groupName.toUpperCase()}</h2>`;
            section.appendChild(header);
        } else if (isKleinStyleGroup) {
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
                if (isLargeSize(article.size)) {
                    // randomize left/right
                    const grootLeft = Math.random() < 0.5;
                    const row = [article];
                    i++;
                    const smalls = [];
                    for (let k = 0; k < 2 && i < articles.length; k++) {
                        if (isSmallSize(articles[i].size)) {
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
                    while (row.length < 3 && i < articles.length && isSmallSize(articles[i].size)) {
                        row.push(articles[i]);
                        i++;
                    }
                    rows.push(row);
                }
            }
            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                if (row.length === 2 && row.every(a => isSmallSize(a.size))) {
                    const prev = rows[r - 1];
                    if (prev.every(a => isSmallSize(a.size)) && prev.length < 3) {
                        prev.push(row.shift());
                    }
                }
            }
            rows.forEach(row => {
                const rowEl = document.createElement('div');
                rowEl.className = 'standaard-row';
                if (row.length === 3 && row.some(a => isLargeSize(a.size))) {
                    rowEl.style.display = 'grid';
                    rowEl.style.gridTemplateColumns = '1fr 1fr';
                    rowEl.style.gap = '20px';
                    const groot = row.find(a => isLargeSize(a.size));
                    const smalls = row.filter(a => isSmallSize(a.size));
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
                    if (row.every(a => isSmallSize(a.size))) {
                        rowEl.style.display = 'grid';
                        rowEl.style.gridTemplateColumns = '1fr';
                    } else {
                        rowEl.style.display = 'grid';
                        rowEl.style.gridTemplateColumns = '1fr 1fr';
                    }
                    rowEl.style.gap = '20px';
                    row.forEach(item => {
                        const card = this.createArticleCard(item);
                        if (isLargeSize(item.size)) card.classList.add('large-item');
                        else card.classList.add('small-item');
                        rowEl.appendChild(card);
                    });
                } else {
                    rowEl.style.display = 'grid';
                    rowEl.style.gridTemplateColumns = '1fr';
                    rowEl.style.gap = '20px';
                    const card = this.createArticleCard(row[0]);
                    if (isLargeSize(row[0].size)) card.classList.add('large-item');
                    else card.classList.add('small-item');
                    rowEl.appendChild(card);
                }
                container.appendChild(rowEl);
            });
        } else {
            let gridClass = 'group-grid-dynamic';
            if (groupName === 'featured') {
                gridClass = 'featured-grid-dynamic';
            } else if (isKleinStyleGroup) {
                gridClass = 'klein-nieuws-grid-dynamic';
            }
            container.className = gridClass;
            articles.forEach((article) => {
                const card = this.createArticleCard(article);
                if (isLargeSize(article.size)) {
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
        const isTextOnly = article.size === 'tekst';
        const html = isTextOnly
            ? `
                <div class="article-text-block">
                    ${categoryLabel}
                    <div class="article-text-title">${article.title}</div>
                </div>
            `
            : `
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
        if (isTextOnly) {
            card.classList.add('article-card-text');
        }
        card.innerHTML = html;
        card.addEventListener('click', () => {
            if (article.id) {
                window.location.href = `/article/${article.id}`;
            }
        });
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
    const miniContainer = document.getElementById('miniContainer');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const heroImage = document.getElementById('heroImage');
    const heroTitle = document.getElementById('heroTitle');
    const heroLink = document.getElementById('heroLink');
    const newsletterTitle = document.getElementById('newsletterTitle');
    const newsletterText = document.getElementById('newsletterText');
    const newsletterButton = document.getElementById('newsletterButton');
    const workshopTitle = document.getElementById('workshopTitle');
    const workshopText = document.getElementById('workshopText');
    const workshopButton = document.getElementById('workshopButton');

    try {
        const [groupsData, siteSettings, articlesData] = await Promise.all([
            loader.loadGroups(),
            fetch('http://127.0.0.1:5000/api/site').then(res => res.ok ? res.json() : null),
            fetch('http://127.0.0.1:5000/api/articles').then(res => res.ok ? res.json() : [])
        ]);
        loadingEl.style.display = 'none';

        const groupNames = Object.keys(groupsData || {});
        const shuffledGroups = groupNames
            .map(name => ({ name, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(entry => entry.name);

        // set hero image based on the latest article with an image across all articles
        const heroArticle = loader.findLatestArticleWithImage({ all: articlesData || [] });
        if (heroArticle) {
            const heroSrc = loader.getFirstImage(heroArticle);
            if (heroSrc && heroImage) {
                heroImage.style.backgroundImage = `url('${heroSrc}')`;
            }
            if (heroTitle) {
                heroTitle.textContent = heroArticle.title || '';
            }
            if (heroLink) {
                heroLink.href = heroArticle.id ? `/article/${heroArticle.id}` : '#';
            }
        }


        if (siteSettings) {
            if (newsletterTitle) newsletterTitle.textContent = siteSettings.newsletterTitle || '';
            if (newsletterText) newsletterText.textContent = siteSettings.newsletterText || '';
            if (newsletterButton) {
                newsletterButton.textContent = siteSettings.newsletterButtonText || '';
                newsletterButton.href = siteSettings.newsletterButtonLink || '#';
            }
            if (workshopTitle) workshopTitle.textContent = siteSettings.workshopTitle || '';
            if (workshopText) workshopText.textContent = siteSettings.workshopText || '';
            if (workshopButton) {
                workshopButton.textContent = siteSettings.workshopButtonText || '';
                workshopButton.href = siteSettings.workshopButtonLink || '#';
            }
        }

        const kleinArticles = (groupsData['het klein nieuws'] || []).slice(0, 2);
        const miniatuurArticles = (groupsData['de miniatuurwereld'] || []).slice(0, 4);

        if (kleinContainer) kleinContainer.innerHTML = '';
        if (miniContainer) miniContainer.innerHTML = '';

        const kleinSection = kleinArticles.length > 0
            ? loader.createGroupSection('het klein nieuws', kleinArticles)
            : null;
        const miniSection = miniatuurArticles.length > 0
            ? loader.createGroupSection('de miniatuurwereld', miniatuurArticles)
            : null;

        if (kleinSection && miniSection && kleinContainer && miniContainer) {
            const swapSides = Math.random() < 0.5;
            if (swapSides) {
                kleinSection.classList.add('stagger');
                miniContainer.appendChild(kleinSection);
                kleinContainer.appendChild(miniSection);
            } else {
                miniSection.classList.add('stagger');
                kleinContainer.appendChild(kleinSection);
                miniContainer.appendChild(miniSection);
            }
            kleinContainer.style.display = 'block';
            miniContainer.style.display = 'block';
        } else if (kleinSection && kleinContainer) {
            kleinContainer.appendChild(kleinSection);
            kleinContainer.style.display = 'block';
            if (miniContainer) miniContainer.style.display = 'none';
        } else if (miniSection && kleinContainer) {
            kleinContainer.appendChild(miniSection);
            kleinContainer.style.display = 'block';
            if (miniContainer) miniContainer.style.display = 'none';
        } else {
            if (kleinContainer) kleinContainer.style.display = 'none';
            if (miniContainer) miniContainer.style.display = 'none';
        }

        const ungroupedArticles = (articlesData || []).filter(article => !article.group);
        if (ungroupedArticles.length > 0) {
            const mainSection = loader.createGroupSection('standaard', ungroupedArticles);
            container.appendChild(mainSection);
        }
    } catch (error) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.innerHTML = `<strong>Error loading articles:</strong> ${error.message}<br><small>Make sure the backend server is running at http://127.0.0.1:5000</small>`;
    }
});

