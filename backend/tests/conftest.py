"""
Fixtures dos testes.

Os testes rodam em SQLite em memória, então não tocam no Supabase.
Dois ajustes fazem o SQLite se comportar como o Postgres nos pontos
que importam:

  * colunas ARRAY (Lead.presenca_digital / objetivo_site) viram JSON;
  * PRAGMA foreign_keys=ON, para o ON DELETE CASCADE funcionar.

Rode da raiz do projeto:  python -m pytest backend/tests -v
"""
import sqlite3

import pytest
from flask import Flask
from sqlalchemy import ARRAY, JSON, event
from sqlalchemy.engine import Engine

from backend import models  # noqa: F401  (registra os models no metadata)
from backend.database import db
from backend.routes.interacoes import interacoes_bp


@event.listens_for(Engine, "connect")
def _ativar_foreign_keys(dbapi_connection, _):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


@pytest.fixture()
def app():
    for tabela in db.metadata.tables.values():
        for coluna in tabela.columns:
            if isinstance(coluna.type, ARRAY):
                coluna.type = JSON()

    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite://",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    db.init_app(app)
    app.register_blueprint(interacoes_bp, url_prefix="/interacoes")

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()