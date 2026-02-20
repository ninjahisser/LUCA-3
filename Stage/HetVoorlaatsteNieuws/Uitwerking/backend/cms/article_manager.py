import json
import os
from datetime import datetime
import uuid

class ArticleManager:
    def __init__(self, articles_dir):
        self.articles_dir = articles_dir
        os.makedirs(articles_dir, exist_ok=True)
    
    def create_article(self, title, author, category, components, size="klein"):
        """Create a new article and save as JSON
        
        Args:
            title: Article title
            author: Author name
            category: Article category
            components: List of components (dicts with 'type' and content fields)
            size: 'klein' or 'groot'
        """
        article_id = str(uuid.uuid4())[:8]
        
        article = {
            'id': article_id,
            'title': title,
            'author': author,
            'category': category,
            'size': size,
            'components': components,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        filepath = os.path.join(self.articles_dir, f'{article_id}.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article, f, ensure_ascii=False, indent=2)
        
        return article
    
    def update_article(self, article_id, **kwargs):
        """Update an existing article"""
        filepath = os.path.join(self.articles_dir, f'{article_id}.json')
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Article {article_id} not found")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            article = json.load(f)
        
        # Update allowed fields
        for key in ['title', 'components', 'author', 'category', 'size']:
            if key in kwargs:
                article[key] = kwargs[key]
        
        article['updated_at'] = datetime.now().isoformat()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article, f, ensure_ascii=False, indent=2)
        
        return article
    
    def delete_article(self, article_id):
        """Delete an article"""
        filepath = os.path.join(self.articles_dir, f'{article_id}.json')
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
    
    def get_all_articles(self):
        """Get all articles"""
        articles = []
        for filename in os.listdir(self.articles_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.articles_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    articles.append(json.load(f))
        return sorted(articles, key=lambda x: x['created_at'], reverse=True)
