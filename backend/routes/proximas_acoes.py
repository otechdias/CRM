from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from backend.database import db
from backend.models import Cliente, Interacao, Lead

proximas_acoes_bp = Blueprint("proximas_acoes", __name__)

FUSO_BRASIL = timezone(timedelta(hours=-3))


def _hoje():
    return datetime.now(FUSO_BRASIL).date()


def listar_proximas_acoes(
    busca="",
    responsavel="",
    origem="",
    apenas_atrasadas=False,
    limite=None,
):
    """
    ÚNICA fonte das próximas ações. Usada pelo Dashboard e pela
    página /crm/proximas-acoes.

    - Leads: a ação vem do próprio lead (o POST/PUT de interações já
      copia a próxima ação para o lead em sincronizar_origem).
    - Clientes: a ação vem da interação mais recente de cada cliente
      (o cliente só guarda `proximo_contato`, sem o nome da ação).
    """
    busca = (busca or "").strip()
    responsavel = (responsavel or "").strip()
    hoje = _hoje()
    itens = []

    # ---------------- LEADS ----------------
    if origem in ("", "lead"):
        query = db.session.query(Lead).filter(
            Lead.data_proxima_acao.isnot(None)
        )

        if busca:
            termo = f"%{busca}%"
            query = query.filter(or_(
                Lead.nome_empresa.ilike(termo),
                Lead.nome_contato.ilike(termo),
            ))

        if responsavel:
            query = query.filter(Lead.responsavel == responsavel)

        for lead in query.all():
            itens.append({
                "origem": "lead",
                "id": lead.id,
                "empresa": lead.nome_empresa,
                "responsavel": lead.responsavel,
                "acao": lead.proxima_acao,
                "data": lead.data_proxima_acao.isoformat(),
                "horario": (
                    lead.horario_proxima_acao.strftime("%H:%M")
                    if lead.horario_proxima_acao else None
                ),
                "prioridade": lead.prioridade,
                "status": lead.status_lead,
            })

    # ---------------- CLIENTES ----------------
    if origem in ("", "cliente"):
        query = (
            db.session.query(Interacao)
            .join(Cliente, Interacao.cliente_id == Cliente.id)
            .filter(
                Interacao.data_proxima_acao.isnot(None),
                or_(
                    Interacao.proxima_acao.is_(None),
                    Interacao.proxima_acao != "Nenhuma",
                ),
            )
        )

        if busca:
            query = query.filter(Cliente.nome_empresa.ilike(f"%{busca}%"))

        if responsavel:
            query = query.filter(Interacao.responsavel == responsavel)

        vistos = set()

        for i in query.order_by(
            Interacao.data_interacao.desc(), Interacao.id.desc()
        ).all():
            # só a interação mais recente de cada cliente conta
            if i.cliente_id in vistos:
                continue
            vistos.add(i.cliente_id)

            itens.append({
                "origem": "cliente",
                "id": i.cliente_id,
                "empresa": i.cliente.nome_empresa if i.cliente else None,
                "responsavel": i.responsavel,
                "acao": i.proxima_acao,
                "data": i.data_proxima_acao.isoformat(),
                "horario": None,
                "prioridade": None,
                "status": i.cliente.status_cliente if i.cliente else None,
            })

    # ---------------- comum ----------------
    for item in itens:
        item["atrasada"] = item["data"] < hoje.isoformat()

    if apenas_atrasadas:
        itens = [i for i in itens if i["atrasada"]]

    itens.sort(key=lambda i: (i["data"], i["horario"] or "23:59"))

    return itens[:limite] if limite else itens


@proximas_acoes_bp.route("/", methods=["GET"], strict_slashes=False)
def listar():
    try:
        itens = listar_proximas_acoes(
            busca=request.args.get("busca", ""),
            responsavel=request.args.get("responsavel", ""),
            origem=request.args.get("origem", ""),
            apenas_atrasadas=request.args.get("atrasadas") == "1",
            limite=request.args.get("limite", type=int),
        )
        return jsonify(itens), 200

    except Exception as e:
        return jsonify({
            "erro": "Erro ao listar próximas ações.",
            "detalhes": str(e),
        }), 500