# شعب داتا العظيم — SHAAB DATA ELADIM

Full-stack Flask web app for the IUP Data Science cohort (2022–2025), Mauritanian flag color theme.

## Tech Stack
- **Backend**: Flask + Flask-SQLAlchemy + Flask-Login
- **Database**: SQLite (`instance/shaab_data.db`) — auto-created on first run
- **Frontend**: Jinja2 templates + plain CSS + vanilla JS (no framework)
- **Auth**: Session-based login with hashed passwords (werkzeug)

## Project Structure
```
app.py                      # Flask app — models, routes, seed data
templates/
  index.html                # Main single-page app
  login.html                # Login page
  register.html             # Register page
  profile_edit.html         # Member profile editor (emoji, title, bio)
static/
  css/style.css             # Mauritanian flag theme (green/red/gold/white)
  js/main.js                # Countdown, shoutouts AJAX, poll voting, gallery upload
  uploads/                  # User-uploaded files (images & videos)
instance/
  shaab_data.db             # SQLite database (auto-generated)
```

## Features
| Feature | Storage | Auth needed? |
|---------|---------|--------------|
| Hero + countdown | Static JS | No |
| Member cards | **DB** (User model) | Register to appear |
| Profile editing (emoji, title, bio) | **DB** | Yes |
| Quotes board | Hardcoded in `app.py` | No |
| Gallery (photo/video upload) | **Disk** + DB | Yes |
| Shoutout wall | **DB** (Shoutout model) | Yes |
| Polls & voting | **DB** (Poll/PollOption) | No (session-tracked) |

## API Endpoints
- `GET  /` — main page
- `GET  /login` `POST /login` — auth
- `GET  /register` `POST /register` — auth
- `GET  /logout` — logout
- `GET  /profile/edit` `POST /profile/edit` — member profile
- `GET  /api/shoutouts` — list shoutouts
- `POST /api/shoutouts` — submit (auth required)
- `POST /api/gallery/upload` — upload file (auth required)
- `GET  /api/gallery` — list items
- `DELETE /api/gallery/<id>` — delete own item (auth required)
- `POST /api/polls/<id>/vote` — cast vote

## User Flow
1. User registers → immediately taken to `/profile/edit` to fill in their card
2. They set: display name, title, bio/quote, emoji
3. Their card appears live on the home page members grid
4. They can upload photos/videos to the gallery section
5. They can post on the shoutout wall

## Customization
- **Quotes**: edit `QUOTES` list in `app.py`
- **Graduation date**: change `GRADUATION` in `static/js/main.js`
- **Upload limit**: change `MAX_MB` in `app.py`
