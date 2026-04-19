from flask import (Flask, render_template, request, jsonify,
                   redirect, url_for, abort, session, send_from_directory)
from flask_sqlalchemy import SQLAlchemy
from flask_login import (LoginManager, UserMixin, login_user,
                         logout_user, login_required, current_user)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
import os, uuid

UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_IMAGE = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_VIDEO = {'mp4', 'webm', 'mov'}
ALLOWED_ALL   = ALLOWED_IMAGE | ALLOWED_VIDEO
MAX_MB        = 64

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///shaab_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'shaab-data-el-azeem-2025')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_MB * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'يجب تسجيل الدخول أولاً'

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_ALL

def file_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    return 'video' if ext in ALLOWED_VIDEO else 'image'

# ─── MODELS ───────────────────────────────────────────────

class User(UserMixin, db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    username     = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(80), nullable=False)
    password_hash= db.Column(db.String(256), nullable=False)
    # Profile fields
    title        = db.Column(db.String(100), default='')
    bio          = db.Column(db.String(300), default='')
    emoji        = db.Column(db.String(10),  default='🧠')
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    shoutouts    = db.relationship('Shoutout', backref='author', lazy=True)
    gallery_items= db.relationship('GalleryItem', backref='uploader', lazy=True)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def to_dict(self):
        return {
            'id': self.id,
            'display_name': self.display_name,
            'title': self.title or 'Data Science Student',
            'bio': self.bio or '...',
            'emoji': self.emoji or '🧠',
        }

@login_manager.user_loader
def load_user(uid):
    return db.session.get(User, int(uid))

class Shoutout(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    message    = db.Column(db.String(500), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    guest_name = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def display_name_str(self):
        return self.author.display_name if self.author else (self.guest_name or 'مجهول')

    def to_dict(self):
        diff = datetime.utcnow() - self.created_at
        secs = int(diff.total_seconds())
        if secs < 60:       t = 'الآن'
        elif secs < 3600:   t = f'منذ {secs//60} دقيقة'
        elif secs < 86400:  t = f'منذ {secs//3600} ساعة'
        else:               t = f'منذ {secs//86400} يوم'
        return {'id': self.id, 'name': self.display_name_str(), 'message': self.message, 'time': t}

class GalleryItem(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    filename   = db.Column(db.String(200), nullable=False)
    caption    = db.Column(db.String(150), default='')
    ftype      = db.Column(db.String(10),  default='image')   # 'image' | 'video'
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def url(self):
        return url_for('static', filename='uploads/' + self.filename)

    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url(),
            'caption': self.caption,
            'ftype': self.ftype,
            'uploader': self.uploader.display_name if self.uploader else 'مجهول',
        }

class Poll(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.String(200), nullable=False)
    active   = db.Column(db.Boolean, default=True)
    options  = db.relationship('PollOption', backref='poll', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        opts  = [o.to_dict() for o in self.options]
        total = sum(o['votes'] for o in opts)
        for o in opts:
            o['pct'] = round((o['votes'] / total * 100) if total else 0)
        return {'id': self.id, 'question': self.question, 'options': opts, 'total': total}

class PollOption(db.Model):
    id      = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('poll.id'), nullable=False)
    text    = db.Column(db.String(150), nullable=False)
    votes   = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {'id': self.id, 'text': self.text, 'votes': self.votes}

# ─── STATIC FALLBACK DATA ─────────────────────────────────

QUOTES = [
    {"text": "الاستاذ: هل فهمتم؟ الشعب: نعم. بعد الامتحان: 🤡", "author": "— الشعب جماعة", "context": "كل ليلة قبل الامتحان"},
    {"text": "المشروع الأول في الحياة العملية سيبدأ من الصفر بغض النظر عما درسنا", "author": "— حكمة شعبية", "context": "اكتُشفت في التربص"},
    {"text": "Correlation is not causation — لكن في الامتحان: كل شيء سببي", "author": "— إجماع الشعب", "context": "إحصاء، الفصل الثالث"},
    {"text": "نموذجي وصل 95% دقة. على بيانات التدريب فقط.", "author": "— كل واحد فينا", "context": "مشروع PFE"},
    {"text": "الداتا ما كدبتش، لكن العينة ضغيفة شوية", "author": "— الأستاذ في كل مرة", "context": "عرض الفصل"},
    {"text": "سأعمل في Google بعد التخرج بستة أشهر", "author": "— نحن في 2022", "context": "اليوم الأول في IUP"},
]

def seed_db():
    if Poll.query.count() == 0:
        p = Poll(question="من سيجد عمل أول في الشعب العظيم؟")
        db.session.add(p)
        db.session.flush()
        db.session.add_all([
            PollOption(poll_id=p.id, text="اللي ما توقعناه",              votes=14),
            PollOption(poll_id=p.id, text="اللي دايم يقول عنده connections", votes=8),
            PollOption(poll_id=p.id, text="صاحب الـ LinkedIn المحدّث",    votes=19),
            PollOption(poll_id=p.id, text="اللي ما يزال يذاكر",           votes=5),
        ])
    if Shoutout.query.count() == 0:
        db.session.add_all([
            Shoutout(guest_name="لبات",  message="يا شعب داتا العظيم، التاريخ سيذكرنا 🏆"),
            Shoutout(guest_name="عضو 2", message="كل الـ models في العالم ما تساوى صداقتنا 💛"),
            Shoutout(guest_name="عضو 3", message="بعد التخرج، نطلع نفس خطة العمل 😂"),
        ])
    db.session.commit()

# ─── AUTH ─────────────────────────────────────────────────

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    error = None
    if request.method == 'POST':
        u = User.query.filter_by(username=request.form.get('username','').strip().lower()).first()
        if u and u.check_password(request.form.get('password','')):
            login_user(u, remember=True)
            return redirect(url_for('index'))
        error = 'اسم المستخدم أو كلمة المرور غير صحيحة'
    return render_template('login.html', error=error)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    error = None
    if request.method == 'POST':
        username     = request.form.get('username','').strip().lower()
        display_name = request.form.get('display_name','').strip()
        password     = request.form.get('password','')
        confirm      = request.form.get('confirm','')
        if not username or not display_name or not password:
            error = 'يرجى ملء جميع الحقول'
        elif len(password) < 6:
            error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
        elif password != confirm:
            error = 'كلمتا المرور غير متطابقتين'
        elif User.query.filter_by(username=username).first():
            error = 'اسم المستخدم مأخوذ، اختر آخر'
        else:
            u = User(username=username, display_name=display_name)
            u.set_password(password)
            db.session.add(u)
            db.session.commit()
            login_user(u, remember=True)
            return redirect(url_for('edit_profile'))
    return render_template('register.html', error=error)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# ─── PROFILE ──────────────────────────────────────────────

@app.route('/profile/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    error = None
    success = None
    if request.method == 'POST':
        current_user.display_name = request.form.get('display_name', '').strip()[:80] or current_user.display_name
        current_user.title        = request.form.get('title', '').strip()[:100]
        current_user.bio          = request.form.get('bio', '').strip()[:300]
        current_user.emoji        = request.form.get('emoji', '🧠').strip()[:10] or '🧠'
        db.session.commit()
        success = 'تم حفظ الملف الشخصي ✓'
    return render_template('profile_edit.html', error=error, success=success)

# ─── GALLERY ──────────────────────────────────────────────

@app.route('/api/gallery/upload', methods=['POST'])
@login_required
def gallery_upload():
    if 'file' not in request.files:
        return jsonify({'error': 'لا يوجد ملف'}), 400
    f = request.files['file']
    if not f.filename or not allowed(f.filename):
        return jsonify({'error': 'نوع الملف غير مدعوم'}), 400

    ext      = f.filename.rsplit('.', 1)[1].lower()
    fname    = f'{uuid.uuid4().hex}.{ext}'
    fpath    = os.path.join(app.config['UPLOAD_FOLDER'], fname)
    f.save(fpath)

    caption = request.form.get('caption', '').strip()[:150]
    item    = GalleryItem(
        filename=fname,
        caption=caption,
        ftype=file_type(fname),
        user_id=current_user.id,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/gallery', methods=['GET'])
def get_gallery():
    since = request.args.get('since', 0, type=int)
    q = GalleryItem.query.order_by(GalleryItem.created_at.desc())
    if since:
        q = q.filter(GalleryItem.id > since)
    items = q.limit(50).all()
    return jsonify([i.to_dict() for i in items])

@app.route('/api/gallery/<int:item_id>', methods=['DELETE'])
@login_required
def delete_gallery_item(item_id):
    item = db.session.get(GalleryItem, item_id) or abort(404)
    if item.user_id != current_user.id:
        abort(403)
    try:
        os.remove(os.path.join(app.config['UPLOAD_FOLDER'], item.filename))
    except OSError:
        pass
    db.session.delete(item)
    db.session.commit()
    return jsonify({'ok': True})

# ─── MAIN ─────────────────────────────────────────────────

@app.route('/')
def index():
    poll        = Poll.query.filter_by(active=True).order_by(Poll.id.desc()).first()
    shoutouts   = Shoutout.query.order_by(Shoutout.created_at.desc()).limit(30).all()
    members     = User.query.order_by(User.created_at).all()
    gallery     = GalleryItem.query.order_by(GalleryItem.created_at.desc()).limit(30).all()
    voted_polls = session.get('voted_polls', [])
    user_voted  = bool(poll and poll.id in voted_polls)
    return render_template(
        'index.html',
        members=members,
        quotes=QUOTES,
        gallery=gallery,
        poll=poll.to_dict() if poll else None,
        user_voted=user_voted,
        shoutouts=[s.to_dict() for s in shoutouts],
        member_count=len(members),
    )

# ─── API: SHOUTOUTS ───────────────────────────────────────

@app.route('/api/shoutouts', methods=['GET'])
def get_shoutouts():
    since = request.args.get('since', 0, type=int)
    q = Shoutout.query.order_by(Shoutout.created_at.desc())
    if since:
        q = q.filter(Shoutout.id > since)
    items = q.limit(30).all()
    return jsonify([s.to_dict() for s in items])

@app.route('/api/shoutouts', methods=['POST'])
@login_required
def post_shoutout():
    data    = request.get_json(force=True)
    message = (data.get('message') or '').strip()[:500]
    if not message:
        abort(400)
    s = Shoutout(message=message, user_id=current_user.id)
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201

# ─── API: POLLS ───────────────────────────────────────────

@app.route('/api/polls/<int:poll_id>/vote', methods=['POST'])
def vote(poll_id):
    poll        = db.session.get(Poll, poll_id) or abort(404)
    voted_polls = session.get('voted_polls', [])
    if poll_id in voted_polls:
        return jsonify({'error': 'already voted'}), 400
    data   = request.get_json(force=True)
    option = PollOption.query.filter_by(id=data.get('option_id'), poll_id=poll_id).first_or_404()
    option.votes += 1
    db.session.commit()
    voted_polls.append(poll_id)
    session['voted_polls'] = voted_polls
    return jsonify(poll.to_dict())

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
