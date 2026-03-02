

const statusEl = document.getElementById('edit-status');
const formEl = document.getElementById('edit-form');
const groupSelect = document.getElementById('group');
const newGroupInput = document.getElementById('new-group');
const componentsList = document.getElementById('components-list');
const previewLink = document.getElementById('preview-link');

function setStatus(message, kind = 'info') {
    statusEl.textContent = message;
    statusEl.className = `cms-status cms-status-${kind}`;
}

function getArticleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadGroups() {
    try {
        const res = await fetch(`${API_BASE_URL}/groups`);
        if (!res.ok) {
            throw new Error('Groups niet gevonden');
        }
        const groupsData = await res.json();
        return Object.keys(groupsData || {}).sort();
    } catch (error) {
        return [];
    }
}

function populateGroupSelect(groups, currentGroup) {
    const options = groups.slice();
    if (currentGroup && !options.includes(currentGroup)) {
        options.unshift(currentGroup);
    }
    if (!options.includes('standaard')) {
        options.push('standaard');
    }
    options.sort();

    groupSelect.innerHTML = '';
    options.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        groupSelect.appendChild(option);
    });
    const newOption = document.createElement('option');
    newOption.value = '__new__';
    newOption.textContent = 'Nieuwe groep aanmaken';
    groupSelect.appendChild(newOption);

    if (currentGroup) {
        groupSelect.value = currentGroup;
    } else {
        groupSelect.value = 'standaard';
    }

    toggleNewGroupInput();
}

function toggleNewGroupInput() {
    const isNew = groupSelect.value === '__new__';
    newGroupInput.style.display = isNew ? 'block' : 'none';
}

groupSelect.addEventListener('change', toggleNewGroupInput);

function createComponentRow(type, data = {}) {
    const row = document.createElement('div');
    row.className = 'component-row';
    row.dataset.type = type;

    const header = document.createElement('div');
    header.className = 'component-header';
    header.innerHTML = `
        <span class="component-type">${type}</span>
        <button type="button" class="component-remove">Verwijderen</button>
    `;

    const body = document.createElement('div');
    body.className = 'component-body';

    if (type === 'text') {
        body.innerHTML = `
            <label>Tekst</label>
            <textarea class="cms-textarea component-input" rows="4">${data.content || ''}</textarea>
        `;
    } else {
        const srcValue = data.src || '';
        const altValue = data.alt || '';
        body.innerHTML = `
            <label>Bron (URL)</label>
            <input type="text" class="cms-input component-input" value="${srcValue}">
            ${type === 'image' ? `
            <label>Alt tekst</label>
            <input type="text" class="cms-input component-alt" value="${altValue}">
            ` : ''}
        `;
    }

    header.querySelector('.component-remove').addEventListener('click', () => {
        row.remove();
    });

    row.appendChild(header);
    row.appendChild(body);
    componentsList.appendChild(row);
}

function renderComponents(components) {
    componentsList.innerHTML = '';
    (components || []).forEach(component => {
        createComponentRow(component.type, component);
    });
}

function collectComponents() {
    const rows = Array.from(componentsList.querySelectorAll('.component-row'));
    return rows.map(row => {
        const type = row.dataset.type;
        if (type === 'text') {
            const content = row.querySelector('.component-input').value.trim();
            return { type, content };
        }
        const src = row.querySelector('.component-input').value.trim();
        const component = { type, src };
        if (type === 'image') {
            component.alt = row.querySelector('.component-alt').value.trim();
        }
        return component;
    }).filter(component => {
        if (component.type === 'text') {
            return component.content.length > 0;
        }
        return component.src.length > 0;
    });
}

document.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', () => {
        createComponentRow(button.dataset.add, {});
    });
});

async function loadArticle() {
    const articleId = getArticleId();
    if (!articleId) {
        setStatus('Geen artikel-ID meegegeven.', 'error');
        formEl.style.display = 'none';
        return;
    }

    if (previewLink) {
        previewLink.href = `/article/${encodeURIComponent(articleId)}`;
    }

    setStatus('Artikel laden...', 'info');
    try {
        const res = await fetch(`${API_BASE_URL}/articles/${encodeURIComponent(articleId)}`);
        if (!res.ok) {
            throw new Error('Artikel niet gevonden');
        }
        const article = await res.json();
        document.getElementById('title').value = article.title || '';
        document.getElementById('category').value = article.category || '';
        document.getElementById('size').value = article.size || 'klein';
        const groups = await loadGroups();
        populateGroupSelect(groups, article.group || 'standaard');
        renderComponents(article.components || []);
        setStatus('Artikel geladen.', 'success');
    } catch (error) {
        setStatus(`Fout bij laden: ${error.message}`, 'error');
        formEl.style.display = 'none';
    }
}

formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const articleId = getArticleId();
    if (!articleId) {
        setStatus('Geen artikel-ID meegegeven.', 'error');
        return;
    }

    const components = collectComponents();
    const groupValue = groupSelect.value === '__new__'
        ? newGroupInput.value.trim()
        : groupSelect.value.trim();

    if (!groupValue) {
        setStatus('Geef een groepsnaam op.', 'error');
        return;
    }

    const payload = {
        title: document.getElementById('title').value.trim(),
        category: document.getElementById('category').value.trim(),
        group: groupValue,
        size: document.getElementById('size').value,
        components
    };

    setStatus('Opslaan...', 'info');
    try {
        const res = await fetch(`${API_BASE_URL}/articles/${encodeURIComponent(articleId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error('Opslaan mislukt');
        }
        setStatus('Artikel opgeslagen.', 'success');
    } catch (error) {
        setStatus(`Fout bij opslaan: ${error.message}`, 'error');
    }
});

loadArticle();
