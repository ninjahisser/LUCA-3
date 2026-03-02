from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import json
from cms.article_manager import ArticleManager
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

ARTICLES_DIR = os.path.join(BASE_DIR, 'articles')
article_manager = ArticleManager(ARTICLES_DIR)
VIEWS_FILE = os.path.join(BASE_DIR, 'views.json')
SETTINGS_FILE = os.path.join(BASE_DIR, 'site_settings.json')

def load_views():
    if os.path.exists(VIEWS_FILE):
        with open(VIEWS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_views(views):
    with open(VIEWS_FILE, 'w', encoding='utf-8') as f:
        json.dump(views, f, ensure_ascii=False, indent=2)

def load_site_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        'newsletterTitle': 'GEEN WERK MEER MISSEN?',
        'newsletterText': 'MELD JE AAN OF DE NIEUWSBRIEF',
        'newsletterButtonText': 'JA IK WIL DE NIEUWSBRIEF',
        'newsletterButtonLink': '#',
        'workshopTitle': 'ONTDEK ONZE WORKSHOP SPEEDANIMATIE',
        'workshopText': 'Ik neem de allergrootste jaren workshops in SMAAK, designmuseum, scholen en veel meer!',
        'workshopButtonText': 'IK WIL MEER WETEN',
        'workshopButtonLink': '#'
    }

def save_site_settings(settings):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

@app.route('/api/articles', methods=['GET'])
def get_articles():
    articles = article_manager.get_all_articles()
    views = load_views()
    for article in articles:
        aid = article['id']
        article['views'] = views.get(aid, {}).get('views', 0)
        article['clicks'] = views.get(aid, {}).get('clicks', 0)
    return jsonify(articles)

@app.route('/api/articles', methods=['POST'])
def create_article():
    data = json.loads(request.data)
    article = article_manager.create_article(
        title=data.get('title'),
        category=data.get('category'),
        group=data.get('group'),
        components=data.get('components', []),
        size=data.get('size', 'klein')
    )
    return jsonify(article)

@app.route('/api/articles/<article_id>', methods=['PUT'])
def update_article(article_id):
    data = json.loads(request.data)
    article = article_manager.update_article(article_id, **data)
    return jsonify(article)

@app.route('/api/articles/<article_id>', methods=['DELETE'])
def delete_article(article_id):
    ok = article_manager.delete_article(article_id)
    return jsonify({'success': ok})

@app.route('/api/articles/<article_id>/view', methods=['POST'])
def add_view(article_id):
    views = load_views()
    now = datetime.now().isoformat()
    if article_id not in views:
        views[article_id] = {'views': 0, 'clicks': 0, 'history': []}
    views[article_id]['views'] += 1
    views[article_id]['history'].append({'type': 'view', 'timestamp': now})
    save_views(views)
    return jsonify({'views': views[article_id]['views']})

@app.route('/api/articles/<article_id>/click', methods=['POST'])
def add_click(article_id):
    views = load_views()
    now = datetime.now().isoformat()
    if article_id not in views:
        views[article_id] = {'views': 0, 'clicks': 0, 'history': []}
    views[article_id]['clicks'] += 1
    views[article_id]['history'].append({'type': 'click', 'timestamp': now})
    save_views(views)
    return jsonify({'clicks': views[article_id]['clicks']})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    views = load_views()
    articles = article_manager.get_all_articles()
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    stats = {
        'totalViews': sum(v['views'] for v in views.values()),
        'mostVisited': {'title': '', 'views': 0},
        'mostClicked': {'title': '', 'clicks': 0},
        'viewsPerArticle': []
    }
    for article in articles:
        aid = article['id']
        v = views.get(aid, {'views': 0, 'clicks': 0, 'history': []})
        stats['viewsPerArticle'].append({'title': article['title'], 'views': v['views']})
        week_views = sum(1 for h in v.get('history', []) if h['type'] == 'view' and h['timestamp'] >= week_ago.isoformat())
        if week_views > stats['mostVisited']['views']:
            stats['mostVisited'] = {'title': article['title'], 'views': week_views}
        if v['clicks'] > stats['mostClicked']['clicks']:
            stats['mostClicked'] = {'title': article['title'], 'clicks': v['clicks']}
    return jsonify(stats)

@app.route('/api/site', methods=['GET'])
def get_site_settings():
    return jsonify(load_site_settings())

@app.route('/api/site', methods=['PUT'])
def update_site_settings():
    data = json.loads(request.data)
    current = load_site_settings()
    current.update({
        'newsletterTitle': data.get('newsletterTitle', current.get('newsletterTitle')),
        'newsletterText': data.get('newsletterText', current.get('newsletterText')),
        'newsletterButtonText': data.get('newsletterButtonText', current.get('newsletterButtonText')),
        'newsletterButtonLink': data.get('newsletterButtonLink', current.get('newsletterButtonLink')),
        'workshopTitle': data.get('workshopTitle', current.get('workshopTitle')),
        'workshopText': data.get('workshopText', current.get('workshopText')),
        'workshopButtonText': data.get('workshopButtonText', current.get('workshopButtonText')),
        'workshopButtonLink': data.get('workshopButtonLink', current.get('workshopButtonLink'))
    })
    save_site_settings(current)
    return jsonify(current)

@app.route('/api/groups', methods=['GET'])
def get_groups():
    groups = {}
    articles = article_manager.get_all_articles()
    for article in articles:
        group_name = article.get('group')
        if not group_name:
            continue
        if group_name not in groups:
            groups[group_name] = []
        groups[group_name].append(article)
    return jsonify(groups)

@app.route('/api/articles/<article_id>', methods=['GET'])
def get_article(article_id):
    """Get a specific article by ID"""
    filepath = os.path.join(ARTICLES_DIR, f'{article_id}.json')
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                article = json.load(f)
                return jsonify(article)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Article not found'}), 404

@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/cms')
def serve_cms():
    return send_from_directory(FRONTEND_DIR, 'cms.html')

@app.route('/cms-edit')
def serve_cms_edit():
    return send_from_directory(FRONTEND_DIR, 'cms-edit.html')

@app.route('/cms-create')
def serve_cms_create():
    return send_from_directory(FRONTEND_DIR, 'cms-create.html')

@app.route('/article/<article_id>')
def serve_article(article_id):
    return send_from_directory(FRONTEND_DIR, 'article.html')

@app.route('/api/upload', methods=['POST'])
def upload_image():
    """Upload image with naming convention: article_id_index.ext"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Geen bestand gevonden'}), 400
        
        file = request.files['file']
        article_id = request.form.get('article_id', '')
        index = request.form.get('index', '0')
        
        if not file or not article_id:
            return jsonify({'error': 'Artikel ID en bestand required'}), 400
        
        # Get file extension
        filename = file.filename or 'image'
        ext = os.path.splitext(filename)[1].lower()
        if not ext:
            ext = '.jpg'
        
        # Create images directory if not exists
        images_dir = os.path.join(BASE_DIR, 'images')
        if not os.path.exists(images_dir):
            os.makedirs(images_dir)
        
        # Save with naming convention: article_id_index.ext
        new_filename = f"{article_id}_{index}{ext}"
        filepath = os.path.join(images_dir, new_filename)
        file.save(filepath)
        
        # Return relative path for storage
        image_url = f"/images/{new_filename}"
        return jsonify({'url': image_url}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/images/<path:filename>')
def serve_image(filename):
    """Serve uploaded images"""
    images_dir = os.path.join(BASE_DIR, 'images')
    return send_from_directory(images_dir, filename)

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(FRONTEND_DIR, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
