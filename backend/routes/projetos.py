# BACKEND/PROJETO.PY
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import Cliente, Pagamento, Projeto


# ============================================================
# BLUEPRINT
# ============================================================

projetos_bp = Blueprint("projetos", __name__)


# ============================================================
# VALORES PERMITIDOS
# ============================================================

STATUS_PROJETO = [
    "Briefing",
    "Em andamento",
    "Em revisão",
    "Aguardando cliente",
    "Pausado",
    "Entregue",
    "Cancelado",
]

STATUS_ENTREGUE = "Entregue"

PRIORIDADES = [
    "Baixa",
    "Normal",
    "Alta",
    "Urgente",
]

TIPOS_PROJETO = [
    "Landing Page",
    "Site Institucional",
    "Site Profissional",
    "E-commerce",
    "Catálogo Online",
    "Portal",
    "Blog",
    "Sistema Web",
    "Área do Cliente",
    "Página de Captura",
    "Página de Vendas",
    "Redesign de Site",
    "Otimização de Site Existente",
    "Manutenção",
    "Outro",
]

PLANOS = [
    "Plano Essencial",
    "Plano Pro",
    "Plano Pro Max",
]

# (campo, opções válidas)
CAMPOS_SELECT = [
    ("tipo_projeto", TIPOS_PROJETO),
    ("plano", PLANOS),
    ("status_projeto", STATUS_PROJETO),
    ("prioridade", PRIORIDADES),
]


# ============================================================
# CAMPOS
# ============================================================

CAMPOS_PERMITIDOS = {
    "cliente_id",
    "nome_projeto",
    "tipo_projeto",
    "plano",
    "status_projeto",
    "responsavel",
    "prioridade",
    "data_inicio",
    "data_previsao",
    "data_entrega",
    "valor_projeto",
    "link_projeto",
    "repositorio",
    "dominio",
    "observacoes",
}

CAMPOS_TEXTO_OPCIONAIS = {
    "responsavel",
    "link_projeto",
    "repositorio",
    "dominio",
    "observacoes",
}

CAMPOS_DATA = [
    "data_inicio",
    "data_previsao",
    "data_entrega",
]

LIMITES_TEXTO = {
    "nome_projeto": 255,
    "responsavel": 255,
}

VALOR_MAXIMO = Decimal("99999999.99")  # Numeric(10, 2)

DOMINIO_REGEX = re.compile(r"^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$")
URL_REGEX = re.compile(r"^https?://\S+$", re.IGNORECASE)


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def normalizar_texto(campo, valor):
    """
    Remove espaços. String vazia vira None.
    """

    if valor is None:
        return None

    if not isinstance(valor, str):
        raise ValueError(f"O campo '{campo}' deve ser um texto.")

    valor = valor.strip()

    return valor or None


def normalizar_opcao(campo, valor, opcoes):
    """
    Aceita a opção sem diferenciar maiúsculas/minúsculas
    e devolve sempre a forma padrão (ex.: 'em andamento'
    vira 'Em andamento').
    """

    v = normalizar_texto(campo, valor)

    if v is None:
        return None

    for opcao in opcoes:
        if opcao.lower() == v.lower():
            return opcao

    raise ValueError(
        f"Valor inválido para '{campo}'. "
        f"Valores permitidos: {', '.join(opcoes)}."
    )


def converter_data(campo, valor):
    if valor is None:
        return None

    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, date):
        return valor

    if isinstance(valor, str):
        v = valor.strip()

        if not v:
            return None

        if "T" in v:
            v = v.split("T")[0]

        try:
            return datetime.strptime(v, "%Y-%m-%d").date()

        except ValueError:
            raise ValueError(
                f"Data inválida para '{campo}': '{valor}'. "
                f"Use o formato YYYY-MM-DD."
            )

    raise ValueError(f"Formato de data inválido para '{campo}'.")


def converter_valor(valor):
    """
    Converte para Decimal com 2 casas. Vazio vira None.
    """

    if valor is None:
        return None

    if isinstance(valor, str):
        valor = valor.strip()

        if not valor:
            return None

    if isinstance(valor, bool):
        raise ValueError("O campo 'valor_projeto' deve ser numérico.")

    try:
        numero = Decimal(str(valor))

    except (InvalidOperation, ValueError):
        raise ValueError("O campo 'valor_projeto' deve ser numérico.")

    if not numero.is_finite():
        raise ValueError("O campo 'valor_projeto' deve ser numérico.")

    if numero < 0:
        raise ValueError("O campo 'valor_projeto' não pode ser negativo.")

    if numero > VALOR_MAXIMO:
        raise ValueError("O campo 'valor_projeto' excede o valor máximo permitido.")

    return numero.quantize(Decimal("0.01"))


def validar_url(campo, valor):
    if valor is None:
        return

    if not URL_REGEX.match(valor):
        raise ValueError(
            f"O campo '{campo}' deve ser um link começando com "
            f"http:// ou https://."
        )


def validar_dominio(valor):
    if valor is None:
        return

    if not DOMINIO_REGEX.match(valor):
        raise ValueError(
            "O campo 'dominio' deve conter apenas o domínio, "
            "por exemplo: empresa.com.br."
        )


def validar_cliente(valor):
    """
    Retorna o id do cliente, garantindo que ele existe.
    """

    if valor is None or (isinstance(valor, str) and not valor.strip()):
        raise ValueError("O campo 'cliente_id' é obrigatório.")

    if isinstance(valor, bool):
        raise ValueError("O campo 'cliente_id' deve ser um número.")

    try:
        cliente_id = int(valor)

    except (TypeError, ValueError):
        raise ValueError("O campo 'cliente_id' deve ser um número.")

    if db.session.get(Cliente, cliente_id) is None:
        raise ValueError("Cliente não encontrado.")

    return cliente_id


# ============================================================
# PREPARAÇÃO DOS DADOS
# ============================================================

def preparar_dados(data, projeto_atual=None):
    """
    Filtra, normaliza e valida os dados recebidos.

    projeto_atual = None  -> criação (POST)
    projeto_atual = obj   -> atualização (PUT)
    """

    is_update = projeto_atual is not None

    if not isinstance(data, dict):
        raise ValueError("Formato de dados inválido.")

    # --------------------------------------------------------
    # 1. Somente campos permitidos
    #    (id, cliente_nome, created_at etc. são ignorados)
    # --------------------------------------------------------

    dados = {
        campo: valor
        for campo, valor in data.items()
        if campo in CAMPOS_PERMITIDOS
    }

    def final(campo):
        """Valor que o campo terá depois da gravação."""

        if campo in dados:
            return dados[campo]

        if projeto_atual is not None:
            return getattr(projeto_atual, campo, None)

        return None

    # --------------------------------------------------------
    # 2. Cliente
    # --------------------------------------------------------

    if not is_update or "cliente_id" in dados:
        dados["cliente_id"] = validar_cliente(
            dados.get("cliente_id")
        )

    # --------------------------------------------------------
    # 3. Nome do projeto
    # --------------------------------------------------------

    if not is_update or "nome_projeto" in dados:

        nome = normalizar_texto(
            "nome_projeto",
            dados.get("nome_projeto")
        )

        if not nome:
            raise ValueError(
                "O campo 'nome_projeto' é obrigatório."
            )

        dados["nome_projeto"] = nome

    # --------------------------------------------------------
    # 4. Textos opcionais
    # --------------------------------------------------------

    for campo in CAMPOS_TEXTO_OPCIONAIS:

        if campo in dados:
            dados[campo] = normalizar_texto(campo, dados[campo])

    for campo, limite in LIMITES_TEXTO.items():

        valor = dados.get(campo)

        if valor and len(valor) > limite:
            raise ValueError(
                f"O campo '{campo}' pode ter no máximo "
                f"{limite} caracteres."
            )

    validar_url("link_projeto", dados.get("link_projeto"))
    validar_url("repositorio", dados.get("repositorio"))
    validar_dominio(dados.get("dominio"))

    # --------------------------------------------------------
    # 5. Campos de seleção
    # --------------------------------------------------------

    for campo, opcoes in CAMPOS_SELECT:

        if campo not in dados:
            continue

        valor = normalizar_opcao(campo, dados[campo], opcoes)

        if (
            valor is None
            and is_update
            and campo in ("status_projeto", "prioridade")
        ):
            raise ValueError(
                f"O campo '{campo}' não pode ser vazio."
            )

        dados[campo] = valor

    if not is_update:

        if dados.get("status_projeto") is None:
            dados["status_projeto"] = "Briefing"

        if dados.get("prioridade") is None:
            dados["prioridade"] = "Normal"

    # --------------------------------------------------------
    # 6. Valor
    # --------------------------------------------------------

    if "valor_projeto" in dados:
        dados["valor_projeto"] = converter_valor(
            dados["valor_projeto"]
        )

    # --------------------------------------------------------
    # 7. Datas
    # --------------------------------------------------------

    for campo in CAMPOS_DATA:

        if campo in dados:
            dados[campo] = converter_data(campo, dados[campo])

    inicio = final("data_inicio")
    previsao = final("data_previsao")
    entrega = final("data_entrega")

    # Projeto entregue sem data de entrega: usa a data de hoje
    if final("status_projeto") == STATUS_ENTREGUE and not entrega:

        entrega = date.today()

        if inicio and inicio > entrega:
            entrega = inicio

        dados["data_entrega"] = entrega

    if inicio and previsao and previsao < inicio:
        raise ValueError(
            "A data de previsão não pode ser anterior "
            "à data de início."
        )

    if inicio and entrega and entrega < inicio:
        raise ValueError(
            "A data de entrega não pode ser anterior "
            "à data de início."
        )

    return dados


# ============================================================
# GET - LISTAR
# ============================================================

@projetos_bp.route("/", methods=["GET"])
def listar():

    try:

        query = Projeto.query.options(
            joinedload(Projeto.cliente)
        )

        # Filtro opcional: /projetos/?cliente_id=3
        cliente_id = request.args.get("cliente_id", type=int)

        if cliente_id:
            query = query.filter(Projeto.cliente_id == cliente_id)

        registros = query.order_by(Projeto.id.desc()).all()

        return jsonify(
            [registro.to_dict() for registro in registros]
        ), 200

    except Exception as e:

        return jsonify({
            "erro": "Erro ao listar projetos.",
            "detalhes": str(e)
        }), 500


# ============================================================
# GET - OBTER POR ID
# ============================================================

@projetos_bp.route("/<int:id>", methods=["GET"])
def obter(id):

    try:

        registro = db.session.get(Projeto, id)

        if not registro:
            return jsonify({
                "erro": "Projeto não encontrado."
            }), 404

        return jsonify(registro.to_dict()), 200

    except Exception as e:

        return jsonify({
            "erro": "Erro ao buscar projeto.",
            "detalhes": str(e)
        }), 500


# ============================================================
# POST - CRIAR
# ============================================================

@projetos_bp.route("/", methods=["POST"])
def criar():

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return jsonify({
            "erro": "Nenhum dado enviado."
        }), 400

    try:

        dados = preparar_dados(data)

        novo = Projeto(**dados)

        db.session.add(novo)
        db.session.commit()

        return jsonify(novo.to_dict()), 201

    except ValueError as e:

        db.session.rollback()

        return jsonify({
            "erro": str(e)
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao criar projeto.",
            "detalhes": str(e)
        }), 500


# ============================================================
# PUT - ATUALIZAR
# ============================================================

@projetos_bp.route("/<int:id>", methods=["PUT"])
def atualizar(id):

    registro = db.session.get(Projeto, id)

    if not registro:
        return jsonify({
            "erro": "Projeto não encontrado."
        }), 404

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return jsonify({
            "erro": "Nenhum dado enviado."
        }), 400

    try:

        dados = preparar_dados(data, projeto_atual=registro)

        # Não trocar o cliente de um projeto que já tem pagamentos,
        # senão os pagamentos ficariam com outro cliente.
        if (
            "cliente_id" in dados
            and dados["cliente_id"] != registro.cliente_id
            and Pagamento.query.filter_by(
                projeto_id=registro.id
            ).first()
        ):
            raise ValueError(
                "Este projeto possui pagamentos vinculados. "
                "Não é possível trocar o cliente."
            )

        for campo, valor in dados.items():
            setattr(registro, campo, valor)

        db.session.commit()

        return jsonify(registro.to_dict()), 200

    except ValueError as e:

        db.session.rollback()

        return jsonify({
            "erro": str(e)
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao atualizar projeto.",
            "detalhes": str(e)
        }), 500


# ============================================================
# DELETE - DELETAR
# ============================================================

@projetos_bp.route("/<int:id>", methods=["DELETE"])
def deletar(id):

    registro = db.session.get(Projeto, id)

    if not registro:
        return jsonify({
            "erro": "Projeto não encontrado."
        }), 404

    try:

        # Pagamentos vinculados NÃO são apagados: continuam
        # existindo para o cliente, apenas sem projeto.
        Pagamento.query.filter_by(
            projeto_id=registro.id
        ).update({"projeto_id": None})

        db.session.delete(registro)
        db.session.commit()

        return jsonify({
            "msg": "Projeto deletado com sucesso!"
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "erro": "Não foi possível deletar o projeto.",
            "detalhes": str(e)
        }), 500