from datetime import date
from flask import Blueprint, jsonify, request
from backend.models import Lead, Interacao

proximas_acoes_bp = Blueprint("proximas_acoes", __name__)


def normalizar_texto(valor):
    return str(valor).strip().lower() if valor else ""


@proximas_acoes_bp.route("", methods=["GET"], strict_slashes=False)
@proximas_acoes_bp.route("/", methods=["GET"], strict_slashes=False)
def listar():
    busca = request.args.get("busca", "").strip()
    responsavel = request.args.get("responsavel", "").strip()
    prioridade = request.args.get("prioridade", "").strip()
    apenas_atrasadas = request.args.get("atrasadas") == "1"
    hoje = date.today().isoformat()

    acoes = []

    leads = (
        Lead.query
        .filter(Lead.data_proxima_acao.isnot(None))
        .filter(Lead.status_lead.notin_(["Perdido", "Convertido", "Ex-Cliente"]))
        .all()
    )

    for lead in leads:
        acoes.append({
            "origem": "lead",
            "id": lead.id,
            "empresa": lead.nome_empresa,
            "responsavel": lead.responsavel,
            "acao": lead.proxima_acao,
            "data": lead.data_proxima_acao.isoformat() if lead.data_proxima_acao else None,
            "horario": lead.horario_proxima_acao.strftime("%H:%M") if lead.horario_proxima_acao else None,
            "prioridade": lead.prioridade,
            "status": lead.status_lead,
        })

    interacoes = Interacao.query.filter(Interacao.data_proxima_acao.isnot(None)).all()

    for interacao in interacoes:
        empresa = (
            interacao.lead.nome_empresa if interacao.lead
            else interacao.cliente.nome_empresa if interacao.cliente
            else None
        )

        acoes.append({
            "origem": "interacao",
            "id": interacao.id,
            "lead_id": interacao.lead_id,
            "cliente_id": interacao.cliente_id,
            "empresa": empresa,
            "responsavel": interacao.responsavel,
            "acao": interacao.proxima_acao,
            "data": interacao.data_proxima_acao.isoformat() if interacao.data_proxima_acao else None,
            "horario": None,
            "prioridade": None,
            "status": None,
        })

    if busca:
        termo = normalizar_texto(busca)
        acoes = [a for a in acoes if termo in normalizar_texto(a["empresa"])]

    if responsavel:
        acoes = [a for a in acoes if a["responsavel"] == responsavel]

    if prioridade:
        acoes = [a for a in acoes if a["prioridade"] == prioridade]

    if apenas_atrasadas:
        acoes = [a for a in acoes if a["data"] and a["data"] < hoje and a["acao"] != "Nenhuma"]

    acoes.sort(key=lambda a: (a["data"] or "9999-12-31", a["horario"] or "23:59"))

    return jsonify(acoes), 200