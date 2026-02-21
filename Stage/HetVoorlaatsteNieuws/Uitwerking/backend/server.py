from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import json
from cms.article_manager import ArticleManager
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

ARTICLES_DIR = os.path.join(os.path.dirname(__file__), 'articles')
article_manager = ArticleManager(ARTICLES_DIR)
VIEWS_FILE = os.path.join(os.path.dirname(__file__), 'views.json')

def load_views():
    if os.path.exists(VIEWS_FILE):
        with open(VIEWS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_views(views):
    with open(VIEWS_FILE, 'w', encoding='utf-8') as f:
        json.dump(views, f, ensure_ascii=False, indent=2)

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
        author=data.get('author'),
        category=data.get('category'),
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

@app.route('/api/groups', methods=['GET'])
def get_groups():
    groups = {}
    articles = article_manager.get_all_articles()
    for article in articles:
        group_name = article.get('group', 'other')
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

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
