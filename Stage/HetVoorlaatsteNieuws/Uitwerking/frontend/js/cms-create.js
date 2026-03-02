

const statusEl = document.getElementById('create-status');
const formEl = document.getElementById('create-form');
const groupSelect = document.getElementById('group');
const newGroupInput = document.getElementById('new-group');
const componentsList = document.getElementById('components-list');

function setStatus(message, kind = 'info') {
    statusEl.textContent = message;
    statusEl.className = `cms-status cms-status-${kind}`;
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

function populateGroupSelect(groups) {
    const options = groups.slice();
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

    groupSelect.value = 'standaard';
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
    } else if (type === 'image') {
        const srcValue = data.src || '';
        const altValue = data.alt || '';
        body.innerHTML = `
            <label>Afbeelding uploaden</label>
            <input type="file" class="cms-input component-file" accept="image/*">
            <label style="margin-top: 10px;">Of bron (URL)</label>
            <input type="text" class="cms-input component-input" placeholder="Of voeg URL in" value="${srcValue}">
            <label>Alt tekst</label>
            <input type="text" class="cms-input component-alt" value="${altValue}">
            <div class="component-upload-status" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
        `;
    } else {
        const srcValue = data.src || '';
        body.innerHTML = `
            <label>Bron (URL)</label>
            <input type="text" class="cms-input component-input" value="${srcValue}">
        `;
    }

    header.querySelector('.component-remove').addEventListener('click', () => {
        row.remove();
    });

    row.appendChild(header);
    row.appendChild(body);
    componentsList.appendChild(row);
    
    // Add file upload handler for images
    if (type === 'image') {
        const fileInput = body.querySelector('.component-file');
        const urlInput = body.querySelector('.component-input');
        const statusDiv = body.querySelector('.component-upload-status');
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Generate temporary article ID (will be replaced on save)
            const tempId = `temp_${Date.now()}`;
            const imageIndex = Array.from(componentsList.querySelectorAll('.component-row[data-type="image"]'))
                .indexOf(row);
            
            statusDiv.textContent = 'Uploaden...';
            statusDiv.style.color = '#666';
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('article_id', tempId);
                formData.append('index', imageIndex);
                
                const response = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) throw new Error('Upload failed');
                
                const data = await response.json();
                urlInput.value = data.url;
                statusDiv.textContent = '✓ Geüpload';
                statusDiv.style.color = '#2d8f46';
            } catch (error) {
                statusDiv.textContent = '✗ Upload mislukt';
                statusDiv.style.color = '#c52020';
                console.error('Upload error:', error);
            }
        });
    }
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

formEl.addEventListener('submit', async (event) => {
    event.preventDefault();

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

    setStatus('Aanmaken...', 'info');
    try {
        const res = await fetch(`${API_BASE_URL}/articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error('Aanmaken mislukt');
        }
        const created = await res.json();
        setStatus('Artikel aangemaakt.', 'success');
        window.location.href = `/cms-edit?id=${encodeURIComponent(created.id)}`;
    } catch (error) {
        setStatus(`Fout bij aanmaken: ${error.message}`, 'error');
    }
});

loadGroups().then(populateGroupSelect);
