# API/INDEX.PY
from backend.app import app as flask_app


COLLECTION_ROUTES = {
    "/leads",
    "/clientes",
    "/projetos",
    "/pagamentos",
    "/planos",
    "/interacoes",
    "/dashboard"
}


def app(environ, start_response):
    path = environ.get("PATH_INFO", "")

    # Remove o prefixo /api
    if path == "/api":
        path = "/"
    elif path.startswith("/api/"):
        path = path[4:]

    # Adiciona "/" somente nas rotas de coleção.
    # Rotas com ID, como /leads/71, devem permanecer sem "/".
    if path in COLLECTION_ROUTES:
        path += "/"

    environ["PATH_INFO"] = path

    return flask_app(environ, start_response)