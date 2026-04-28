from app import app, db, seed_db

with app.app_context():
    db.create_all()
    seed_db()

if __name__ == "__main__":
    app.run()