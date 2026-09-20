from datetime import date, datetime
from flask import Blueprint, jsonify, request
from backend.database import db
from backend.models import Cliente, Lead


# ============================================================
# BLUEPRINT
# ============================================================

clientes_bp = Blueprint("clientes", __name__)


# ============================================================
# VALORES PERMITIDOS
# ============================================================

STATUS_CLIENTE = [
    "Ativo",
    "Inativo",
    "Pausado",
    "Em negociação"
]

TIPOS_CLIENTE = [
    "Cliente de Projeto",
    "Cliente Recorrente",
    "Projeto + Recorrência",
    "Cliente Avulso",
    "Cliente Antigo"
]


# ============================================================
# CAMPOS PERMITIDOS
# ============================================================

CAMPOS_PERMITIDOS = {
    "lead_id",
    "nome_empresa",
    "nome_contato",
    "telefone",
    "email",
    "cidade",
    "ramo",
    "link_site",
    "status_cliente",
    "tipo_cliente",
    "origem_cliente",
    "data_conversao",
    "valor_medio",
    "ultimo_contato",
    "proximo_contato",
    "motivo_inativacao",
    "observacoes"
}


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def converter_data(valor):
    """
    Converte valor para objeto date.
    """
    if not valor:
        return None

    if isinstance(valor, date):
        return valor

    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, str):
        v = valor.strip()
        if not v:
            return None
        if "T" in v:
            v = v.split("T")[0]
        try:
            return datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            return None

    return None

def normalizar_dados(data):
    """
    Converte strings vazias em None.

    Isso evita salvar "" quando o campo deve ser considerado
    vazio/nulo.
    """

    dados = {}

    for campo, valor in data.items():

        if isinstance(valor, str):
            valor = valor.strip()

            if valor == "":
                valor = None

        dados[campo] = valor

    return dados


def validar_campos(data):
    """
    Valida os campos recebidos pela API.
    Retorna uma mensagem de erro ou None.
    """

    # --------------------------------------------------------
    # Campos desconhecidos
    # --------------------------------------------------------

    campos_desconhecidos = set(data.keys()) - CAMPOS_PERMITIDOS

    if campos_desconhecidos:
        return (
            "Campos não permitidos: "
            + ", ".join(sorted(campos_desconhecidos))
        )

    # --------------------------------------------------------
    # Nome da empresa
    # --------------------------------------------------------

    if "nome_empresa" in data:

        nome_empresa = data.get("nome_empresa")

        if nome_empresa is None:
            return "O campo 'nome_empresa' é obrigatório."

        if not isinstance(nome_empresa, str):
            return "O campo 'nome_empresa' deve ser um texto."

        if not nome_empresa.strip():
            return "O campo 'nome_empresa' é obrigatório."

    # --------------------------------------------------------
    # Status
    # --------------------------------------------------------

    if "status_cliente" in data:

        status = data.get("status_cliente")

        if status is not None and status not in STATUS_CLIENTE:
            return (
                "Status de cliente inválido. "
                "Valores permitidos: "
                + ", ".join(STATUS_CLIENTE)
            )

    # --------------------------------------------------------
    # Tipo de cliente
    # --------------------------------------------------------

    if "tipo_cliente" in data:

        tipo = data.get("tipo_cliente")

        if tipo is not None and tipo not in TIPOS_CLIENTE:
            return (
                "Tipo de cliente inválido. "
                "Valores permitidos: "
                + ", ".join(TIPOS_CLIENTE)
            )

    # --------------------------------------------------------
    # Valor médio
    # --------------------------------------------------------

    if "valor_medio" in data:

        valor = data.get("valor_medio")

        if valor is not None:

            try:
                valor_float = float(valor)

                if valor_float < 0:
                    return "O campo 'valor_medio' não pode ser negativo."

            except (TypeError, ValueError):
                return "O campo 'valor_medio' deve ser numérico."

    # --------------------------------------------------------
    # Motivo de inativação
    # --------------------------------------------------------

    if data.get("status_cliente") == "Inativo":

        motivo = data.get("motivo_inativacao")

        if motivo is not None and not str(motivo).strip():
            return (
                "Informe o motivo da inativação "
                "quando o cliente estiver Inativo."
            )

    return None


# ============================================================
# GET - LISTAR TODOS
# ============================================================

@clientes_bp.route("/", methods=["GET"])
def listar():

    try:

        registros = (
            Cliente.query
            .order_by(Cliente.id.desc())
            .all()
        )

        return jsonify(
            [registro.to_dict() for registro in registros]
        ), 200

    except Exception as e:

        return jsonify({
            "erro": "Erro ao listar clientes.",
            "detalhes": str(e)
        }), 500


# ============================================================
# GET - OBTER POR ID
# ============================================================

@clientes_bp.route("/<int:id>", methods=["GET"])
def obter(id):

    try:

        registro = Cliente.query.get(id)

        if not registro:
            return jsonify({
                "erro": "Cliente não encontrado."
            }), 404

        return jsonify(registro.to_dict()), 200

    except Exception as e:

        return jsonify({
            "erro": "Erro ao buscar cliente.",
            "detalhes": str(e)
        }), 500


# ============================================================
# POST - CRIAR
# ============================================================

@clientes_bp.route("/", methods=["POST"])
def criar():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "erro": "Nenhum dado enviado."
        }), 400

    # --------------------------------------------------------
    # Normalização
    # --------------------------------------------------------

    data = normalizar_dados(data)

    # --------------------------------------------------------
    # Validação
    # --------------------------------------------------------

    erro = validar_campos(data)

    if erro:
        return jsonify({
            "erro": erro
        }), 400

    # --------------------------------------------------------
    # Nome obrigatório
    # --------------------------------------------------------

    if not data.get("nome_empresa"):
        return jsonify({
            "erro": "O campo 'nome_empresa' é obrigatório."
        }), 400

    try:

        # --------------------------------------------------------
        # Extrair lead_id
        # --------------------------------------------------------

        lead_id = data.pop("lead_id", None)

        if lead_id is not None:
            try:
                lead_id = int(lead_id)
            except (ValueError, TypeError):
                lead_id = None

        # --------------------------------------------------------
        # Converter datas
        # --------------------------------------------------------

        for campo_data in ["data_conversao", "ultimo_contato", "proximo_contato"]:
            if campo_data in data:
                data[campo_data] = converter_data(data[campo_data])

        if not data.get("data_conversao"):
            data["data_conversao"] = date.today()

        novo = Cliente(**data)
        db.session.add(novo)

        # --------------------------------------------------------
        # CONVERSÃO AUTOMÁTICA DE LEAD PARA CLIENTE
        # --------------------------------------------------------

        conv_date = novo.data_conversao or date.today()
        lead_convertido_ids = set()

        # 1. Lead explícito por lead_id
        if lead_id:
            lead_explicito = Lead.query.get(lead_id)
            if lead_explicito:
                lead_explicito.status_lead = "Convertido"
                lead_explicito.etapa_comercial = "Fechado"
                if not lead_explicito.data_conversao:
                    lead_explicito.data_conversao = conv_date
                lead_convertido_ids.add(lead_explicito.id)

        # 2. Leads ativos correspondentes por nome de empresa, e-mail ou telefone
        open_leads = Lead.query.filter(Lead.status_lead != "Convertido").all()

        empresa_target = novo.nome_empresa.strip().lower() if novo.nome_empresa else None
        email_target = novo.email.strip().lower() if novo.email else None
        tel_target = "".join(filter(str.isdigit, novo.telefone)) if novo.telefone else None

        for l in open_leads:
            if l.id in lead_convertido_ids:
                continue

            matched = False

            if empresa_target and l.nome_empresa and l.nome_empresa.strip().lower() == empresa_target:
                matched = True
            elif email_target and l.email and l.email.strip().lower() == email_target:
                matched = True
            elif tel_target and l.telefone:
                l_tel = "".join(filter(str.isdigit, l.telefone))
                if l_tel and l_tel == tel_target:
                    matched = True

            if matched:
                l.status_lead = "Convertido"
                l.etapa_comercial = "Fechado"
                if not l.data_conversao:
                    l.data_conversao = conv_date

        db.session.commit()

        return jsonify(
            novo.to_dict()
        ), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao criar cliente.",
            "detalhes": str(e)
        }), 500


# ============================================================
# PUT - ATUALIZAR
# ============================================================

@clientes_bp.route("/<int:id>", methods=["PUT"])
def atualizar(id):

    registro = Cliente.query.get(id)

    if not registro:
        return jsonify({
            "erro": "Cliente não encontrado."
        }), 404

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "erro": "Nenhum dado enviado."
        }), 400

    # --------------------------------------------------------
    # Normalização
    # --------------------------------------------------------

    data = normalizar_dados(data)

    # --------------------------------------------------------
    # Validação
    # --------------------------------------------------------

    erro = validar_campos(data)

    if erro:
        return jsonify({
            "erro": erro
        }), 400

    # --------------------------------------------------------
    # Não permitir remover nome da empresa
    # --------------------------------------------------------

    if "nome_empresa" in data and not data["nome_empresa"]:
        return jsonify({
            "erro": "O campo 'nome_empresa' é obrigatório."
        }), 400

    try:

        # ----------------------------------------------------
        # Atualização dos campos
        # ----------------------------------------------------

        for campo, valor in data.items():
            if campo in ["data_conversao", "ultimo_contato", "proximo_contato"]:
                valor = converter_data(valor)
            setattr(registro, campo, valor)

        db.session.commit()

        return jsonify(
            registro.to_dict()
        ), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao atualizar cliente.",
            "detalhes": str(e)
        }), 500


# ============================================================
# DELETE - DELETAR
# ============================================================

@clientes_bp.route("/<int:id>", methods=["DELETE"])
def deletar(id):

    registro = Cliente.query.get(id)

    if not registro:
        return jsonify({
            "erro": "Cliente não encontrado."
        }), 404

    try:

        db.session.delete(registro)
        db.session.commit()

        return jsonify({
            "msg": "Cliente deletado com sucesso!"
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "erro": (
                "Não foi possível deletar o cliente. "
                "Verifique se existem projetos, pagamentos, "
                "planos ou interações vinculados a ele."
            ),
            "detalhes": str(e)
        }), 500