from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)

ARTICLES_DIR = os.path.join(os.path.dirname(__file__), 'articles')

@app.route('/api/articles', methods=['GET'])
def get_articles():
    """Get all articles"""
    articles = []
    if os.path.exists(ARTICLES_DIR):
        for filename in os.listdir(ARTICLES_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(ARTICLES_DIR, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        article = json.load(f)
                        articles.append(article)
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
    
    return jsonify(articles)

@app.route('/api/groups', methods=['GET'])
def get_groups():
    """Get all articles grouped by group"""
    groups = {}
    if os.path.exists(ARTICLES_DIR):
        for filename in os.listdir(ARTICLES_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(ARTICLES_DIR, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        article = json.load(f)
                        group_name = article.get('group', 'other')
                        if group_name not in groups:
                            groups[group_name] = []
                        groups[group_name].append(article)
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
    
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
