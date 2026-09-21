from datetime import date, datetime, time, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import Cliente, Interacao, Lead
from backend.routes.leads import PROXIMAS_ACOES

interacoes_bp = Blueprint("interacoes", __name__)


# ============================================================
# OPÇÕES VÁLIDAS
# ============================================================

TIPOS_INTERACAO = [
    "WhatsApp",
    "Ligação",
    "E-mail",
    "Instagram",
    "Reunião",
    "Presencial",
    "Follow-up",
    "Envio de proposta",
    "Outro",
]

RESULTADOS = [
    "Sem resposta",
    "Respondeu",
    "Interessado",
    "Pediu mais informações",
    "Reunião agendada",
    "Proposta solicitada",
    "Negociando",
    "Fechado",
    "Sem interesse",
    "Retornar depois",
    "Contato inválido",
    "Outro",
]

# Valores da estrutura antiga que precisam ser convertidos.
MAPA_TIPO = {
    "email": "E-mail",
    "ligacao": "Ligação",
    "reuniao": "Reunião",
}


# ============================================================
# CAMPOS
# ============================================================

CAMPOS_PERMITIDOS = {
    "lead_id",
    "cliente_id",
    "responsavel",
    "tipo_interacao",
    "data_interacao",
    "resultado",
    "proxima_acao",
    "data_proxima_acao",
    "descricao",
    "resumo",  # nome antigo de "descricao"
}

# Vêm no JSON de resposta; se o frontend devolver o objeto inteiro
# num PUT, eles são simplesmente ignorados.
CAMPOS_SOMENTE_LEITURA = {
    "id",
    "lead_nome",
    "cliente_nome",
    "created_at",
}


# ============================================================
# NORMALIZAÇÃO E VALIDAÇÃO
# ============================================================

def texto(valor):
    """Remove espaços; string vazia vira None."""
    if isinstance(valor, str):
        valor = valor.strip()
        return valor or None
    return valor


def validar_texto(campo, valor, limite=None):
    v = texto(valor)

    if v is None:
        return None

    if not isinstance(v, str):
        raise ValueError(f"O campo '{campo}' deve ser um texto.")

    if limite and len(v) > limite:
        raise ValueError(
            f"O campo '{campo}' aceita no máximo {limite} caracteres."
        )

    return v


def validar_opcao(campo, valor, opcoes, mapa=None):
    v = texto(valor)

    if v is None:
        return None

    if not isinstance(v, str):
        raise ValueError(f"O campo '{campo}' deve ser um texto.")

    chave = v.lower()

    if mapa and chave in mapa:
        return mapa[chave]

    for opcao in opcoes:
        if opcao.lower() == chave:
            return opcao

    raise ValueError(
        f"Valor inválido para '{campo}'. "
        f"Valores permitidos: {', '.join(opcoes)}."
    )


def converter_datetime(campo, valor):
    v = texto(valor)

    if v is None:
        return None

    if not isinstance(v, str):
        raise ValueError(f"Data/hora inválida para '{campo}'.")

    try:
        # Aceita "2026-09-21", "2026-09-21T10:30" e "2026-09-21T10:30:00".
        # O banco guarda horário sem fuso, então descartamos o fuso.
        return datetime.fromisoformat(v.replace("Z", "+00:00")).replace(
            tzinfo=None
        )
    except ValueError:
        raise ValueError(
            f"Data/hora inválida para '{campo}': '{valor}'. "
            f"Use o formato YYYY-MM-DDTHH:MM."
        )


def converter_data(campo, valor):
    v = texto(valor)

    if v is None:
        return None

    if not isinstance(v, str):
        raise ValueError(f"Data inválida para '{campo}'.")

    try:
        return date.fromisoformat(v.split("T")[0])
    except ValueError:
        raise ValueError(
            f"Data inválida para '{campo}': '{valor}'. "
            f"Use o formato YYYY-MM-DD."
        )


def validar_id(campo, valor, modelo, rotulo):
    """Converte para int e confirma que o registro existe."""
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None

    if isinstance(valor, bool) or not isinstance(valor, (int, str)):
        raise ValueError(f"O campo '{campo}' deve ser um número inteiro.")

    try:
        valor = int(valor)
    except ValueError:
        raise ValueError(f"O campo '{campo}' deve ser um número inteiro.")

    if db.session.get(modelo, valor) is None:
        raise ValueError(f"{rotulo} {valor} não encontrado.")

    return valor


def preparar_dados(data, atual=None):
    """
    Valida o JSON recebido e devolve um dict pronto para o model.

    atual=None  -> criação (tipo_interacao e data_interacao obrigatórios)
    atual=obj   -> atualização parcial
    """
    if not isinstance(data, dict):
        raise ValueError("Formato de dados inválido.")

    dados = {
        campo: valor
        for campo, valor in data.items()
        if campo not in CAMPOS_SOMENTE_LEITURA
    }

    desconhecidos = set(dados) - CAMPOS_PERMITIDOS

    if desconhecidos:
        raise ValueError(
            "Campos não permitidos: " + ", ".join(sorted(desconhecidos)) + "."
        )

    # "resumo" é o nome antigo de "descricao"
    if "resumo" in dados:
        resumo = dados.pop("resumo")
        dados.setdefault("descricao", resumo)

    criando = atual is None
    pronto = {}

    # ---------------- vínculo ----------------

    if "lead_id" in dados:
        pronto["lead_id"] = validar_id(
            "lead_id", dados["lead_id"], Lead, "Lead"
        )

    if "cliente_id" in dados:
        pronto["cliente_id"] = validar_id(
            "cliente_id", dados["cliente_id"], Cliente, "Cliente"
        )

    # ---------------- seleções ----------------

    if "tipo_interacao" in dados:
        pronto["tipo_interacao"] = validar_opcao(
            "tipo_interacao",
            dados["tipo_interacao"],
            TIPOS_INTERACAO,
            MAPA_TIPO,
        )

    if "resultado" in dados:
        pronto["resultado"] = validar_opcao(
            "resultado", dados["resultado"], RESULTADOS
        )

    if "proxima_acao" in dados:
        pronto["proxima_acao"] = validar_opcao(
            "proxima_acao", dados["proxima_acao"], PROXIMAS_ACOES
        )

    # ---------------- datas ----------------

    if "data_interacao" in dados:
        pronto["data_interacao"] = converter_datetime(
            "data_interacao", dados["data_interacao"]
        )

    if "data_proxima_acao" in dados:
        pronto["data_proxima_acao"] = converter_data(
            "data_proxima_acao", dados["data_proxima_acao"]
        )

    # ---------------- textos ----------------

    if "responsavel" in dados:
        pronto["responsavel"] = validar_texto(
            "responsavel", dados["responsavel"], 255
        )

    if "descricao" in dados:
        pronto["descricao"] = validar_texto("descricao", dados["descricao"])

    # ---------------- obrigatórios ----------------

    for campo in ("tipo_interacao", "data_interacao"):
        if (criando or campo in pronto) and pronto.get(campo) is None:
            raise ValueError(f"O campo '{campo}' é obrigatório.")

    # ---------------- exatamente um vínculo ----------------

    lead_id = pronto["lead_id"] if "lead_id" in pronto else (
        atual.lead_id if atual else None
    )
    cliente_id = pronto["cliente_id"] if "cliente_id" in pronto else (
        atual.cliente_id if atual else None
    )

    if (lead_id is None) == (cliente_id is None):
        raise ValueError(
            "Informe exatamente um vínculo: 'lead_id' ou 'cliente_id'."
        )

    # ---------------- próxima ação não pode ser no passado da interação ----

    if "data_interacao" in pronto or "data_proxima_acao" in pronto:
        data_interacao = pronto.get(
            "data_interacao", atual.data_interacao if atual else None
        )
        data_proxima = (
            pronto["data_proxima_acao"]
            if "data_proxima_acao" in pronto
            else (atual.data_proxima_acao if atual else None)
        )

        if data_interacao and data_proxima and (
            data_proxima < data_interacao.date()
        ):
            raise ValueError(
                "A data da próxima ação não pode ser anterior "
                "à data da interação."
            )

    return pronto


# ============================================================
# SINCRONIZAÇÃO COM LEAD / CLIENTE
# ============================================================

def sincronizar_origem(interacao):
    """
    Mantém em dia os campos de contato de quem recebeu a interação.

    Só avança: registrar uma interação antiga (backfill) não faz o
    "último contato" recuar nem sobrescreve a próxima ação.
    """
    dia = interacao.data_interacao.date()
    nenhuma = interacao.proxima_acao == "Nenhuma"

    if interacao.lead_id:
        lead = db.session.get(Lead, interacao.lead_id)

        if lead is None:
            return

        if (
            lead.data_primeiro_contato is None
            or dia < lead.data_primeiro_contato
        ):
            lead.data_primeiro_contato = dia

        lead.abordado = "Sim"

        if lead.data_ultimo_contato is None or dia >= lead.data_ultimo_contato:
            lead.data_ultimo_contato = dia

            if interacao.proxima_acao:
                lead.proxima_acao = interacao.proxima_acao
                lead.data_proxima_acao = (
                    None if nenhuma else interacao.data_proxima_acao
                )

    elif interacao.cliente_id:
        cliente = db.session.get(Cliente, interacao.cliente_id)

        if cliente is None:
            return

        if cliente.ultimo_contato is None or dia >= cliente.ultimo_contato:
            cliente.ultimo_contato = dia

            if nenhuma:
                cliente.proximo_contato = None
            elif interacao.data_proxima_acao:
                cliente.proximo_contato = interacao.data_proxima_acao


# ============================================================
# GET - LISTAR
# ============================================================
#
# Filtros opcionais (query string):
#   lead_id, cliente_id, tipo_interacao, resultado, responsavel,
#   de=YYYY-MM-DD, ate=YYYY-MM-DD
#
# Ordenação: mais recentes primeiro.

@interacoes_bp.route("/", methods=["GET"])
def listar():
    try:
        consulta = Interacao.query.options(
            joinedload(Interacao.lead),
            joinedload(Interacao.cliente),
        )

        lead_id = request.args.get("lead_id", type=int)
        cliente_id = request.args.get("cliente_id", type=int)

        if lead_id is not None:
            consulta = consulta.filter(Interacao.lead_id == lead_id)

        if cliente_id is not None:
            consulta = consulta.filter(Interacao.cliente_id == cliente_id)

        for campo in ("tipo_interacao", "resultado", "responsavel"):
            valor = texto(request.args.get(campo))

            if valor:
                consulta = consulta.filter(
                    getattr(Interacao, campo) == valor
                )

        de = converter_data("de", request.args.get("de"))
        ate = converter_data("ate", request.args.get("ate"))

        if de:
            consulta = consulta.filter(
                Interacao.data_interacao >= datetime.combine(de, time.min)
            )

        if ate:
            consulta = consulta.filter(
                Interacao.data_interacao
                < datetime.combine(ate + timedelta(days=1), time.min)
            )

        registros = consulta.order_by(
            Interacao.data_interacao.desc(),
            Interacao.id.desc(),
        ).all()

        return jsonify([r.to_dict() for r in registros]), 200

    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400

    except Exception as erro:
        return jsonify({
            "erro": "Erro ao listar interações.",
            "detalhes": str(erro),
        }), 500


# ============================================================
# GET - OBTER POR ID
# ============================================================

@interacoes_bp.route("/<int:id>", methods=["GET"])
def obter(id):
    registro = db.session.get(Interacao, id)

    if not registro:
        return jsonify({"erro": "Interação não encontrada."}), 404

    return jsonify(registro.to_dict()), 200


# ============================================================
# POST - CRIAR
# ============================================================

@interacoes_bp.route("/", methods=["POST"])
def criar():
    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return jsonify({"erro": "Nenhum dado enviado."}), 400

    try:
        dados = preparar_dados(data)

        nova = Interacao(**dados)
        db.session.add(nova)

        sincronizar_origem(nova)

        db.session.commit()

        return jsonify(nova.to_dict()), 201

    except ValueError as erro:
        db.session.rollback()
        return jsonify({"erro": str(erro)}), 400

    except Exception as erro:
        db.session.rollback()
        return jsonify({
            "erro": "Erro ao criar interação.",
            "detalhes": str(erro),
        }), 500


# ============================================================
# PUT - ATUALIZAR
# ============================================================

@interacoes_bp.route("/<int:id>", methods=["PUT"])
def atualizar(id):
    registro = db.session.get(Interacao, id)

    if not registro:
        return jsonify({"erro": "Interação não encontrada."}), 404

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return jsonify({"erro": "Nenhum dado enviado."}), 400

    try:
        dados = preparar_dados(data, atual=registro)

        for campo, valor in dados.items():
            setattr(registro, campo, valor)

        sincronizar_origem(registro)

        db.session.commit()

        return jsonify(registro.to_dict()), 200

    except ValueError as erro:
        db.session.rollback()
        return jsonify({"erro": str(erro)}), 400

    except Exception as erro:
        db.session.rollback()
        return jsonify({
            "erro": "Erro ao atualizar interação.",
            "detalhes": str(erro),
        }), 500


# ============================================================
# DELETE - EXCLUIR
# ============================================================

@interacoes_bp.route("/<int:id>", methods=["DELETE"])
def deletar(id):
    registro = db.session.get(Interacao, id)

    if not registro:
        return jsonify({"erro": "Interação não encontrada."}), 404

    try:
        db.session.delete(registro)
        db.session.commit()

        return jsonify({"mensagem": "Interação excluída com sucesso."}), 200

    except Exception as erro:
        db.session.rollback()
        return jsonify({
            "erro": "Erro ao excluir interação.",
            "detalhes": str(erro),
        }), 500