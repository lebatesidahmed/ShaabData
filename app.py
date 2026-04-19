from flask import Flask, render_template, request, jsonify, abort
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///shaab_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'shaab-data-el-azeem-secret')

db = SQLAlchemy(app)

class Shoutout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    message = db.Column(db.String(300), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        diff = datetime.utcnow() - self.created_at
        secs = int(diff.total_seconds())
        if secs < 60:
            time_str = 'الآن'
        elif secs < 3600:
            time_str = f'منذ {secs // 60} دقيقة'
        elif secs < 86400:
            time_str = f'منذ {secs // 3600} ساعة'
        else:
            time_str = f'منذ {secs // 86400} يوم'
        return {
            'id': self.id,
            'name': self.name,
            'message': self.message,
            'time': time_str,
        }

class Poll(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.String(200), nullable=False)
    active = db.Column(db.Boolean, default=True)
    options = db.relationship('PollOption', backref='poll', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        opts = [o.to_dict() for o in self.options]
        total = sum(o['votes'] for o in opts)
        for o in opts:
            o['pct'] = round((o['votes'] / total * 100) if total else 0)
        return {'id': self.id, 'question': self.question, 'options': opts, 'total': total}

class PollOption(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('poll.id'), nullable=False)
    text = db.Column(db.String(150), nullable=False)
    votes = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {'id': self.id, 'text': self.text, 'votes': self.votes}

MEMBERS = [
    {"name": "لبات", "title": "Chief Data Officer", "quote": "نموذجي في الإنتاج، والتقرير جاهز بكرة", "emoji": "🧠", "badge": "الرئيس التنفيذي"},
    {"name": "عضو ٢", "title": "Senior Data Scientist", "quote": "الداتا ما كدبتش بزاف", "emoji": "📈", "badge": "المحلل"},
    {"name": "عضو ٣", "title": "ML Engineer", "quote": "accuracy: 99% على بيانات التدريب", "emoji": "🤖", "badge": "المبرمج"},
    {"name": "عضو ٤", "title": "Data Architect", "quote": "قاعدة بياناتي أفضل من الجميع", "emoji": "🗄️", "badge": "المعمار"},
    {"name": "عضو ٥", "title": "BI Analyst", "quote": "الداشبورد بيجاوب على كل الأسئلة", "emoji": "📊", "badge": "المرئي"},
    {"name": "عضو ٦", "title": "Research Analyst", "quote": "p-value = 0.049، إذن مقبول", "emoji": "🔬", "badge": "الباحث"},
    {"name": "عضو ٧", "title": "Data Storyteller", "quote": "البيانات قصة، وأنا الراوي", "emoji": "📖", "badge": "الحكّاء"},
    {"name": "عضو ٨", "title": "Python Guru", "quote": "import everything", "emoji": "🐍", "badge": "البايثوني"},
]

QUOTES = [
    {"text": "الاستاذ: هل فهمتم؟ الشعب: نعم. بعد الامتحان: 🤡", "author": "— الشعب جماعة", "context": "كل ليلة قبل الامتحان"},
    {"text": "المشروع الأول في الحياة العملية سيبدأ من الصفر بغض النظر عما درسنا", "author": "— حكمة شعبية", "context": "اكتُشفت في التربص"},
    {"text": "Correlation is not causation — لكن في الامتحان: كل شيء سببي", "author": "— إجماع الشعب", "context": "إحصاء، الفصل الثالث"},
    {"text": "نموذجي وصل 95% دقة. على بيانات التدريب فقط.", "author": "— كل واحد فينا", "context": "مشروع PFE"},
    {"text": "الداتا ما كدبتش، لكن العينة ضغيفة شوية", "author": "— الأستاذ في كل مرة", "context": "عرض الفصل"},
    {"text": "سأعمل في Google بعد التخرج بستة أشهر", "author": "— نحن في 2022", "context": "اليوم الأول في IUP"},
]

GALLERY = [
    {"emoji": "🎓", "caption": "يوم التخرج المرتقب"},
    {"emoji": "💻", "caption": "ساعات الكود الطويلة"},
    {"emoji": "📉", "caption": "الـ loss curve الجميل"},
    {"emoji": "☕", "caption": "الوقود الرسمي للشعب"},
    {"emoji": "🐛", "caption": "debug بلا نهاية"},
    {"emoji": "📋", "caption": "ورقة الامتحان المصيرية"},
    {"emoji": "🌙", "caption": "ليالي PFE"},
]

def seed_db():
    if Poll.query.count() == 0:
        p = Poll(question="من سيجد عمل أول في الشعب العظيم؟")
        db.session.add(p)
        db.session.flush()
        opts = [
            PollOption(poll_id=p.id, text="اللي ما توقعناه", votes=14),
            PollOption(poll_id=p.id, text="اللي دايم يقول عنده connections", votes=8),
            PollOption(poll_id=p.id, text="صاحب الـ LinkedIn المحدّث", votes=19),
            PollOption(poll_id=p.id, text="اللي ما يزال يذاكر", votes=5),
        ]
        db.session.add_all(opts)

    if Shoutout.query.count() == 0:
        seeds = [
            Shoutout(name="لبات", message="يا شعب داتا العظيم، التاريخ سيذكرنا 🏆"),
            Shoutout(name="عضو 2", message="كل الـ models في العالم ما تساوى صداقتنا 💛"),
            Shoutout(name="عضو 3", message="بعد التخرج، نطلع نفس خطة العمل 😂"),
        ]
        db.session.add_all(seeds)

    db.session.commit()

@app.route('/')
def index():
    poll = Poll.query.filter_by(active=True).order_by(Poll.id.desc()).first()
    shoutouts = Shoutout.query.order_by(Shoutout.created_at.desc()).limit(20).all()
    return render_template(
        'index.html',
        members=MEMBERS,
        quotes=QUOTES,
        gallery=GALLERY,
        poll=poll.to_dict() if poll else None,
        shoutouts=[s.to_dict() for s in shoutouts],
        member_count=len(MEMBERS),
    )

@app.route('/api/shoutouts', methods=['GET'])
def get_shoutouts():
    shoutouts = Shoutout.query.order_by(Shoutout.created_at.desc()).limit(20).all()
    return jsonify([s.to_dict() for s in shoutouts])

@app.route('/api/shoutouts', methods=['POST'])
def post_shoutout():
    data = request.get_json(force=True)
    name = (data.get('name') or '').strip()[:50]
    message = (data.get('message') or '').strip()[:300]
    if not name or not message:
        abort(400)
    s = Shoutout(name=name, message=message)
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201

@app.route('/api/polls/<int:poll_id>/vote', methods=['POST'])
def vote(poll_id):
    poll = Poll.query.get_or_404(poll_id)
    data = request.get_json(force=True)
    option_id = data.get('option_id')
    option = PollOption.query.filter_by(id=option_id, poll_id=poll_id).first_or_404()
    option.votes += 1
    db.session.commit()
    return jsonify(poll.to_dict())

@app.route('/api/polls/<int:poll_id>', methods=['GET'])
def get_poll(poll_id):
    poll = Poll.query.get_or_404(poll_id)
    return jsonify(poll.to_dict())

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
