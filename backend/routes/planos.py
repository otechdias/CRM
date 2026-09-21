from calendar import monthrange
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request

from backend.database import db
from backend.models import Cliente, PlanoRecorrente


# ============================================================
# BLUEPRINT
# ============================================================

planos_bp = Blueprint("planos", __name__)


# ============================================================
# VALORES PERMITIDOS
# ============================================================

NOMES_PLANO = [
    "Plano Essencial",
    "Plano Pro",
    "Plano Pro Max",
]

STATUS_PLANO = [
    "Ativo",
    "Pausado",
    "Cancelado",
]

TIPOS_COBRANCA = [
    "Mensal",
    "Trimestral",
    "Semestral",
    "Anual",
]

FORMAS_PAGAMENTO = [
    "PIX",
    "Boleto",
    "Cartão de crédito",
    "Cartão de débito",
    "Transferência bancária",
    "Dinheiro",
]

# Compatibilidade com valores antigos
MAPA_STATUS = {
    "ativo": "Ativo",
    "pausado": "Pausado",
    "suspenso": "Pausado",
    "cancelado": "Cancelado",
    "inativo": "Cancelado",
}


# ============================================================
# CAMPOS PERMITIDOS
# ============================================================

CAMPOS_PERMITIDOS = {
    "cliente_id",
    "nome_plano",
    "valor_mensal",
    "dia_cobranca",
    "status_plano",
    "tipo_cobranca",
    "data_inicio",
    "proximo_vencimento",
    "forma_pagamento",
    "data_cancelamento",
    "motivo_cancelamento",
    "observacoes",
}


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def normalizar_texto(valor):
    """
    Remove espaços e converte string vazia em None.
    """
    if isinstance(valor, str):
        valor = valor.strip()

        if valor == "":
            return None

    return valor


def normalizar_opcao(
    campo,
    valor,
    opcoes,
    mapa=None,
    obrigatorio=False
):
    v = normalizar_texto(valor)

    if v is None:
        if obrigatorio:
            raise ValueError(
                f"O campo '{campo}' é obrigatório."
            )

        return None

    if isinstance(v, str):
        v_lower = v.lower()

        if mapa and v_lower in mapa:
            return mapa[v_lower]

        for opcao in opcoes:
            if opcao.lower() == v_lower:
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

        if "T" in v:
            v = v.split("T")[0]

        try:
            return datetime.strptime(v, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(
                f"Data inválida para '{campo}': '{valor}'. "
                f"Use o formato YYYY-MM-DD."
            ) from None

    raise ValueError(
        f"Formato de data inválido para '{campo}'."
    )


def converter_inteiro(
    campo,
    valor,
    minimo=None,
    maximo=None,
    obrigatorio=True
):
    if valor is None:
        if obrigatorio:
            raise ValueError(
                f"O campo '{campo}' é obrigatório."
            )

        return None

    if isinstance(valor, bool):
        raise ValueError(
            f"O campo '{campo}' deve ser um número inteiro."
        )

    try:
        numero = int(valor)

        if isinstance(valor, float) and numero != valor:
            raise ValueError

    except (TypeError, ValueError):
        raise ValueError(
            f"O campo '{campo}' deve ser um número inteiro."
        ) from None

    if (
        (minimo is not None and numero < minimo)
        or (maximo is not None and numero > maximo)
    ):
        raise ValueError(
            f"O campo '{campo}' deve estar entre "
            f"{minimo} e {maximo}."
        )

    return numero


def converter_valor(campo, valor):
    """
    Converte para Decimal com 2 casas (NUMERIC(10,2)).
    """
    if valor is None:
        raise ValueError(
            f"O campo '{campo}' é obrigatório."
        )

    if isinstance(valor, bool):
        raise ValueError(
            f"O campo '{campo}' deve ser numérico."
        )

    try:
        numero = Decimal(
            str(valor).strip().replace(",", ".")
        )
    except InvalidOperation:
        raise ValueError(
            f"O campo '{campo}' deve ser numérico."
        ) from None

    if not numero.is_finite():
        raise ValueError(
            f"O campo '{campo}' deve ser numérico."
        )

    if numero < 0:
        raise ValueError(
            f"O campo '{campo}' não pode ser negativo."
        )

    if numero >= Decimal("100000000"):
        raise ValueError(
            f"O campo '{campo}' excede o valor máximo permitido."
        )

    return numero.quantize(Decimal("0.01"))


def calcular_proximo_vencimento(dia_cobranca, referencia):
    """
    Primeira data igual ou posterior à referência cujo dia
    é o dia de cobrança. Em meses mais curtos, usa o último dia
    do mês (ex.: dia 31 em fevereiro vira dia 28/29).
    """
    ultimo_dia = monthrange(
        referencia.year,
        referencia.month
    )[1]

    candidato = date(
        referencia.year,
        referencia.month,
        min(dia_cobranca, ultimo_dia)
    )

    if candidato >= referencia:
        return candidato

    if referencia.month == 12:
        ano, mes = referencia.year + 1, 1
    else:
        ano, mes = referencia.year, referencia.month + 1

    ultimo_dia = monthrange(ano, mes)[1]

    return date(ano, mes, min(dia_cobranca, ultimo_dia))


# ============================================================
# PREPARAÇÃO E VALIDAÇÃO DOS DADOS
# ============================================================

def preparar_dados(data, plano_atual=None):
    """
    Valida e normaliza os dados recebidos.
    Levanta ValueError com a mensagem de erro.

    plano_atual = None  -> criação
    plano_atual = plano -> atualização parcial (as regras são
                           aplicadas sobre o estado final do plano)
    """

    if not isinstance(data, dict):
        raise ValueError("Formato de dados inválido.")

    atualizando = plano_atual is not None
    hoje = date.today()

    # Só campos permitidos, com strings vazias -> None
    dados = {
        campo: normalizar_texto(valor)
        for campo, valor in data.items()
        if campo in CAMPOS_PERMITIDOS
    }

    def final(campo):
        """Valor que o campo terá depois desta operação."""
        if campo in dados:
            return dados[campo]

        if atualizando:
            return getattr(plano_atual, campo, None)

        return None

    # --------------------------------------------------------
    # Cliente
    # --------------------------------------------------------

    if not atualizando or "cliente_id" in dados:

        dados["cliente_id"] = converter_inteiro(
            "cliente_id",
            dados.get("cliente_id"),
            minimo=1,
            maximo=2147483647
        )

        if db.session.get(Cliente, dados["cliente_id"]) is None:
            raise ValueError("Cliente não encontrado.")

    # --------------------------------------------------------
    # Nome do plano
    # --------------------------------------------------------

    if not atualizando or "nome_plano" in dados:

        dados["nome_plano"] = normalizar_opcao(
            "nome_plano",
            dados.get("nome_plano"),
            NOMES_PLANO,
            obrigatorio=True
        )

    # --------------------------------------------------------
    # Valor mensal
    # --------------------------------------------------------

    if not atualizando or "valor_mensal" in dados:

        dados["valor_mensal"] = converter_valor(
            "valor_mensal",
            dados.get("valor_mensal")
        )

    # --------------------------------------------------------
    # Dia de cobrança
    # --------------------------------------------------------

    if not atualizando or "dia_cobranca" in dados:

        dados["dia_cobranca"] = converter_inteiro(
            "dia_cobranca",
            dados.get("dia_cobranca"),
            minimo=1,
            maximo=31
        )

    # --------------------------------------------------------
    # Status
    # --------------------------------------------------------

    if not atualizando and dados.get("status_plano") is None:
        dados["status_plano"] = "Ativo"

    if "status_plano" in dados:

        dados["status_plano"] = normalizar_opcao(
            "status_plano",
            dados["status_plano"],
            STATUS_PLANO,
            mapa=MAPA_STATUS,
            obrigatorio=True
        )

    # --------------------------------------------------------
    # Tipo de cobrança
    # --------------------------------------------------------

    if not atualizando and dados.get("tipo_cobranca") is None:
        dados["tipo_cobranca"] = "Mensal"

    if "tipo_cobranca" in dados:

        dados["tipo_cobranca"] = normalizar_opcao(
            "tipo_cobranca",
            dados["tipo_cobranca"],
            TIPOS_COBRANCA,
            obrigatorio=True
        )

    # --------------------------------------------------------
    # Forma de pagamento (opcional)
    # --------------------------------------------------------

    if "forma_pagamento" in dados:

        dados["forma_pagamento"] = normalizar_opcao(
            "forma_pagamento",
            dados["forma_pagamento"],
            FORMAS_PAGAMENTO
        )

    # --------------------------------------------------------
    # Datas
    # --------------------------------------------------------

    for campo in (
        "data_inicio",
        "proximo_vencimento",
        "data_cancelamento"
    ):
        if campo in dados:
            dados[campo] = converter_data(
                campo,
                dados[campo]
            )

    if not atualizando and dados.get("data_inicio") is None:
        dados["data_inicio"] = hoje

    # --------------------------------------------------------
    # Motivo do cancelamento (tamanho da coluna)
    # --------------------------------------------------------

    motivo = dados.get("motivo_cancelamento")

    if motivo and len(motivo) > 150:
        raise ValueError(
            "O campo 'motivo_cancelamento' deve ter "
            "no máximo 150 caracteres."
        )

    # --------------------------------------------------------
    # Cancelamento x plano ativo/pausado
    # --------------------------------------------------------

    if final("status_plano") == "Cancelado":

        if not final("motivo_cancelamento"):
            raise ValueError(
                "Informe o motivo do cancelamento "
                "quando o plano estiver Cancelado."
            )

        if final("data_cancelamento") is None:
            dados["data_cancelamento"] = hoje

        inicio = final("data_inicio")

        if inicio and final("data_cancelamento") < inicio:
            raise ValueError(
                "A data de cancelamento não pode ser "
                "anterior à data de início."
            )

        # Plano cancelado não tem próximo vencimento
        dados["proximo_vencimento"] = None

    else:

        # Deixou de estar cancelado: limpa os dados de cancelamento
        dados["data_cancelamento"] = None
        dados["motivo_cancelamento"] = None

        # Próximo vencimento vazio: calcula pelo dia de cobrança
        dia = final("dia_cobranca")

        if final("proximo_vencimento") is None and dia:

            inicio = final("data_inicio") or hoje

            dados["proximo_vencimento"] = (
                calcular_proximo_vencimento(
                    dia,
                    max(inicio, hoje)
                )
            )

    return dados


# ============================================================
# GET - LISTAR TODOS
# ============================================================

@planos_bp.route("/", methods=["GET"])
def listar():

    try:

        query = PlanoRecorrente.query

        # Filtros opcionais: /planos/?cliente_id=1&status_plano=Ativo
        cliente_id = request.args.get("cliente_id", type=int)

        if cliente_id:
            query = query.filter_by(cliente_id=cliente_id)

        status = request.args.get("status_plano")

        if status:
            query = query.filter_by(status_plano=status)

        registros = (
            query
            .order_by(PlanoRecorrente.id.desc())
            .all()
        )

        return jsonify(
            [registro.to_dict() for registro in registros]
        ), 200

    except Exception as e:

        return jsonify({
            "erro": "Erro ao listar planos.",
            "detalhes": str(e)
        }), 500


# ============================================================
# GET - OBTER POR ID
# ============================================================

@planos_bp.route("/<int:id>", methods=["GET"])
def obter(id):

    try:

        registro = db.session.get(PlanoRecorrente, id)

        if not registro:
            return jsonify({
                "erro": "Plano não encontrado."
            }), 404

        return jsonify(registro.to_dict()), 200

    except Exception as e:

        return jsonify({
            "erro": "Erro ao buscar plano.",
            "detalhes": str(e)
        }), 500


# ============================================================
# POST - CRIAR
# ============================================================

@planos_bp.route("/", methods=["POST"])
def criar():

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return jsonify({
            "erro": "Nenhum dado enviado."
        }), 400

    try:

        dados = preparar_dados(data)

        novo = PlanoRecorrente(**dados)

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
            "erro": "Erro ao criar plano.",
            "detalhes": str(e)
        }), 500


# ============================================================
# PUT - ATUALIZAR
# ============================================================

@planos_bp.route("/<int:id>", methods=["PUT"])
def atualizar(id):

    registro = db.session.get(PlanoRecorrente, id)

    if not registro:
        return jsonify({
            "erro": "Plano não encontrado."
        }), 404

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return jsonify({
            "erro": "Nenhum dado enviado."
        }), 400

    try:

        dados = preparar_dados(
            data,
            plano_atual=registro
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
            "erro": "Erro ao atualizar plano.",
            "detalhes": str(e)
        }), 500


# ============================================================
# DELETE - DELETAR
# ============================================================

@planos_bp.route("/<int:id>", methods=["DELETE"])
def deletar(id):

    registro = db.session.get(PlanoRecorrente, id)

    if not registro:
        return jsonify({
            "erro": "Plano não encontrado."
        }), 404

    try:

        db.session.delete(registro)
        db.session.commit()

        return jsonify({
            "msg": "Plano deletado com sucesso!"
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao deletar plano.",
            "detalhes": str(e)
        }), 500