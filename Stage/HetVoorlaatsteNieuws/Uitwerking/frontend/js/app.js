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
        
        // Determine grid class based on group name
        if (groupName === 'het klein nieuws') {
            section.className = 'klein-nieuws-section';
        }
        
        // Create header
        const header = document.createElement('div');
        header.className = 'group-header';
        
        // Header style depends on group
        if (groupName === 'het klein nieuws') {
            header.className = 'klein-nieuws-header';
            header.innerHTML = `<h2>${groupName}</h2>`;
        } else {
            header.innerHTML = `<h2 class="group-title">${groupName.toUpperCase()}</h2>`;
        }
        
        section.appendChild(header);
        
        // Create grid container
        const grid = document.createElement('div');
        
        // Different grid classes for different groups
        if (groupName === 'het klein nieuws') {
            grid.className = 'klein-nieuws-grid-dynamic';
        } else if (groupName === 'featured') {
            grid.className = 'featured-grid-dynamic';
        } else {
            grid.className = 'group-grid-dynamic';
        }
        
        // Add articles to grid
        articles.forEach((article, index) => {
            const card = this.createArticleCard(article);
            
            // Add size classes for chaotic layout
            if (article.size === 'groot') {
                card.classList.add('large-item');
            } else {
                card.classList.add('small-item');
            }
            
            // Add rotation and offset for chaotic effect
            const rotation = (Math.random() - 0.5) * 2; // -1 to 1 degrees
            card.style.transform = `rotate(${rotation}deg)`;
            
            grid.appendChild(card);
        });
        
        section.appendChild(grid);
        
        // Add button for klein nieuws
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
        
        const html = `
            <img src="${imageUrl || 'https://via.placeholder.com/400x300'}" 
                 alt="${article.title}" 
                 class="article-image"
                 onerror="this.src='https://via.placeholder.com/400x300'">
            <div class="article-overlay">
                ${article.category ? `<div class="article-label">${article.category.toUpperCase()}</div>` : ''}
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
            border-radius: 8px;
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
                    componentsHtml += `<img src="${component.src}" alt="Article image" style="width: 100%; margin: 20px 0; border-radius: 4px;">`;
                } else if (component.type === 'video') {
                    componentsHtml += `<video controls style="width: 100%; margin: 20px 0; border-radius: 4px;"><source src="${component.src}"></video>`;
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
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const heroImage = document.getElementById('heroImage');
    
    try {
        const groupsData = await loader.loadGroups();
        loadingEl.style.display = 'none';
        
        // Set hero background image from first article
        let firstArticles = groupsData['het klein nieuws'] || [];
        if (firstArticles.length === 0) {
            firstArticles = groupsData['standaard'] || [];
        }
        if (firstArticles.length > 0) {
            const firstImage = loader.getFirstImage(firstArticles[0]);
            if (firstImage && heroImage) {
                heroImage.style.backgroundImage = `url('${firstImage}')`;
            }
        }
        
        // Render groups in order: het klein nieuws, then standaard
        const groupOrder = ['het klein nieuws', 'standaard'];
        groupOrder.forEach(groupName => {
            if (groupsData[groupName] && groupsData[groupName].length > 0) {
                const section = loader.createGroupSection(groupName, groupsData[groupName]);
                container.appendChild(section);
            }
        });
        
    } catch (error) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.innerHTML = `<strong>Error loading articles:</strong> ${error.message}<br><small>Make sure the backend server is running at http://127.0.0.1:5000</small>`;
    }
});
