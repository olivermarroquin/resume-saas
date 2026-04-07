from flask import Flask

from backend.api.rewrite_routes import rewrite_bp

app = Flask(__name__)
app.register_blueprint(rewrite_bp)
