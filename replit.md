# شعب داتا العظيم — SHAAB DATA ELADIM

Full-stack Flask web app for the IUP Data Science cohort (2022–2025).

## Tech Stack
- **Backend**: Flask (Python) + Flask-SQLAlchemy
- **Database**: SQLite (`shaab_data.db`) — auto-created on first run
- **Frontend**: Jinja2 templates + plain CSS + vanilla JS
- **Fonts**: Playfair Display, EB Garamond, IBM Plex Mono, Tajawal (Google Fonts)

## Project Structure
```
app.py                   # Flask app, models, routes, seed data
templates/
  index.html             # Main Jinja2 template (single page)
static/
  css/style.css          # All styles (dark/gold luxury theme)
  js/main.js             # Countdown, shoutout AJAX, poll voting
shaab_data.db            # SQLite database (auto-generated)
```

## Features
| Feature | Storage |
|---------|---------|
| Hero + seal | Static |
| Countdown to graduation (June 2025) | Static JS |
| Member cards | Hardcoded in `app.py` |
| Quotes/inside jokes board | Hardcoded in `app.py` |
| Meme/emoji gallery | Hardcoded in `app.py` |
| Shoutout wall | **SQLite DB** (`Shoutout` model) |
| Polls & voting | **SQLite DB** (`Poll` + `PollOption` models) |

## API Endpoints
- `GET /` — main page
- `GET /api/shoutouts` — list recent shoutouts
- `POST /api/shoutouts` — submit a new shoutout `{name, message}`
- `GET /api/polls/<id>` — get poll data
- `POST /api/polls/<id>/vote` — cast a vote `{option_id}`

## Running
```bash
python app.py
```
Runs on port 5000. DB is seeded automatically on first start.

## To Customize
- **Members**: Edit the `MEMBERS` list in `app.py`
- **Quotes**: Edit the `QUOTES` list in `app.py`
- **Gallery**: Edit the `GALLERY` list in `app.py`
- **Graduation date**: Change `GRADUATION` in `static/js/main.js`
- **Polls**: Add new `Poll` and `PollOption` records to the DB or seed in `seed_db()`
