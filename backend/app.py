# APP.PY
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

from backend.database import db

from backend.routes.leads import leads_bp
from backend.routes.clientes import clientes_bp
from backend.routes.projetos import projetos_bp
from backend.routes.pagamentos import pagamentos_bp
from backend.routes.planos import planos_bp
from backend.routes.interacoes import interacoes_bp
from backend.routes.dashboard import dashboard_bp

load_dotenv()

app = Flask(__name__)

CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

app.register_blueprint(leads_bp, url_prefix="/leads")
app.register_blueprint(clientes_bp, url_prefix="/clientes")
app.register_blueprint(projetos_bp, url_prefix="/projetos")
app.register_blueprint(pagamentos_bp, url_prefix="/pagamentos")
app.register_blueprint(planos_bp, url_prefix="/planos")
app.register_blueprint(interacoes_bp, url_prefix="/interacoes")
app.register_blueprint(dashboard_bp, url_prefix="/dashboard")


@app.route("/")
def index():
    return {
        "status": "Funcionando",
        "message": "API do CRM online"
    }


if __name__ == "__main__":
    app.run(
        port=8000,
        host="localhost",
        debug=True
    )