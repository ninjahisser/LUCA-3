# HetVoorlaatsteNieuws - Web UI

A modern web application with a CMS backend and frontend that loads articles from JSON files.

## Project Structure

```
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── css/
│   │   └── style.css       # Styling
│   └── js/
│       └── app.js          # Frontend logic
└── backend/
    ├── server.py           # Flask API server
    ├── requirements.txt    # Python dependencies
    ├── cms/
    │   └── article_manager.py  # CMS article management
    └── articles/           # JSON article files (generated)
```

## Backend Setup

### Requirements
- Python 3.7+
- Flask
- Flask-CORS

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Running the Server

```bash
python server.py
```

The server will run on `http://localhost:5000`

### API Endpoints

- `GET /api/articles` - Get all articles
- `GET /api/articles/<article_id>` - Get a specific article

### Article JSON Format

Articles are stored in `backend/articles/` as JSON files:

```json
{
  "id": "article_001",
  "title": "Article Title",
  "excerpt": "Short description",
  "content": "Full article content",
  "author": "Author Name",
  "category": "CATEGORY",
  "created_at": "2026-02-20T10:00:00",
  "updated_at": "2026-02-20T10:00:00"
}
```

### Using ArticleManager (CMS)

```python
from cms.article_manager import ArticleManager

manager = ArticleManager('articles/')

# Create an article
manager.create_article(
    title="My Article",
    content="Full content here",
    author="Author Name",
    category="NEWS"
)

# Get all articles
articles = manager.get_all_articles()

# Update an article
manager.update_article('article_id', title="New Title")

# Delete an article
manager.delete_article('article_id')
```

## Frontend Setup

No build process required - just open `index.html` in a browser or serve with a local server.

### Using with Local Server

```bash
# Using Python
python -m http.server 8000

# Using Node.js (if installed)
npx http-server
```

Then navigate to `http://localhost:8000/frontend/`

### Features

- Responsive grid layout
- Dynamic article loading from API
- Article detail modal view
- Category badges
- Author and date information
- Error handling with user-friendly messages

## Development

### Frontend Architecture

The `app.js` file contains the `ArticleLoader` class which handles:
- Fetching articles from the API
- Rendering articles as cards
- Displaying article details in a modal

### Backend Architecture

- `server.py`: Flask server with CORS enabled for frontend communication
- `article_manager.py`: CMS logic for CRUD operations on articles
- `articles/`: Directory containing JSON article files

## Customization

### Styling
Edit `frontend/css/style.css` to customize colors, layouts, and responsive behavior.

### API Configuration
To change the API endpoint in the frontend, modify the `apiUrl` parameter in `app.js`:

```javascript
const loader = new ArticleLoader('http://your-api-url/api');
```

## Future Enhancements

- Database integration instead of JSON files
- Admin panel for article management
- Search and filtering functionality
- Pagination
- Comments system
- User authentication
