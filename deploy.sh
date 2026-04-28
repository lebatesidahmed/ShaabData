#!/bin/bash
# Production deployment script for شعب داتا العظيم

echo "🚀 Starting production deployment..."

# Install/update dependencies
pip install -e .

# Set production environment variables
export FLASK_ENV=production
export SECRET_KEY=${SECRET_KEY:-"shaab-data-production-key-$(date +%s)"}

# Create necessary directories
mkdir -p static/uploads
mkdir -p instance

# Run database migrations/initialization
python -c "from app import db, app; app.app_context().push(); db.create_all()"

# Start with gunicorn
echo "🌐 Starting server on http://0.0.0.0:8000"
gunicorn --bind 0.0.0.0:8000 --workers 2 --threads 2 wsgi:app