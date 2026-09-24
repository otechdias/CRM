# BACKEND/PAGAMENTOS.PY
"""
Rotas de Pagamentos

GET    /pagamentos/            lista (aceita filtros, veja aplicar_filtros)
GET    /pagamentos/resumo      totais por status (mesmos filtros)
GET    /pagamentos/<id>        um pagamento
POST   /pagamentos/            cria (1 pagamento ou N parcelas)
PUT    /pagamentos/<id>        atualiza (campos parciais)
DELETE /pagamentos/<id>        exclui

Regras de negócio:
- cliente_id, valor e data_vencimento são obrigatórios.
- Se projeto_id for informado, o projeto precisa pertencer ao cliente.
- Status: Pendente, Pago, Atrasado, Cancelado.
    * "Atrasado" é automático: Pendente com vencimento passado vira Atrasado.
    * Pago sem data_pagamento usa a data de hoje.
    * Informar data_pagamento sem status marca o pagamento como Pago.
    * Fora de "Pago", data_pagamento é sempre limpa.
- Parcelamento (somente POST): envie total_parcelas > 1 e valor_total.
  São criadas N parcelas mensais a partir de data_vencimento.
  Para registrar UMA parcela avulsa, envie numero_parcela + total_parcelas + valor.
"""

import unicodedata
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import Cliente, Pagamento, Projeto

pagamentos_bp = Blueprint("pagamentos", __name__)


# ============================================================
# OPÇÕES VÁLIDAS
# ============================================================

STATUS_PAGAMENTO = ["Pendente", "Pago", "Atrasado", "Cancelado"]

TIPOS_PAGAMENTO = [
    "Entrada",
    "Parcela",
    "Pagamento Único",
    "Saldo Final",
    "Mensalidade",
    "Serviço Adicional",
    "Outro",
]

FORMAS_PAGAMENTO = [
    "Pix",
    "Boleto",
    "Cartão de Crédito",
    "Cartão de Débito",
    "Transferência",
    "Dinheiro",
    "Outro",
]

MAX_PARCELAS = 60

CAMPOS_EDITAVEIS = {
    "cliente_id",
    "projeto_id",
    "valor",
    "tipo_pagamento",
    "numero_parcela",
    "total_parcelas",
    "data_vencimento",
    "data_pagamento",
    "status_pagamento",
    "forma_pagamento",
    "observacoes",
}

# Campos devolvidos pela API. Se o front reenviar o objeto inteiro, são ignorados.
CAMPOS_SOMENTE_LEITURA = {
    "id",
    "cliente_nome",
    "projeto_nome",
    "dias_atraso",
    "created_at",
}


# ============================================================
# DATA E TEXTO
# ============================================================

# Brasil (sem horário de verão desde 2019). O servidor roda em UTC,
# então "hoje" precisa ser calculado aqui para o vencimento não virar
# "atrasado" às 21h do dia anterior.
FUSO_BRASIL = timezone(timedelta(hours=-3))


def hoje():
    return datetime.now(FUSO_BRASIL).date()


def somar_meses(data, meses):
    """Soma meses mantendo o dia (31/01 + 1 mês = 28/02 ou 29/02)."""
    indice = data.month - 1 + meses
    ano = data.year + indice // 12
    mes = indice % 12 + 1
    dia = min(data.day, monthrange(ano, mes)[1])
    return date(ano, mes, dia)


def normalizar_texto(valor):
    if isinstance(valor, str):
        valor = valor.strip()
        return valor or None
    return valor


def _chave(texto):
    """Minúsculo e sem acento, para comparar 'cartao de credito' com 'Cartão de Crédito'."""
    decomposto = unicodedata.normalize("NFD", str(texto).lower())
    return "".join(c for c in decomposto if unicodedata.category(c) != "Mn")


def normalizar_opcao(campo, valor, opcoes):
    valor = normalizar_texto(valor)

    if valor is None:
        return None

    if isinstance(valor, str):
        alvo = _chave(valor)

        for opcao in opcoes:
            if _chave(opcao) == alvo:
                return opcao

    raise ValueError(
        f"Valor inválido para '{campo}'. "
        f"Valores permitidos: {', '.join(opcoes)}."
    )


def converter_data(campo, valor):
    valor = normalizar_texto(valor)

    if valor is None:
        return None

    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, date):
        return valor

    if isinstance(valor, str):
        try:
            return datetime.strptime(valor.split("T")[0], "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(
                f"Data inválida para '{campo}': '{valor}'. "
                f"Use o formato YYYY-MM-DD."
            )

    raise ValueError(f"Formato de data inválido para '{campo}'.")


def converter_inteiro(campo, valor):
    valor = normalizar_texto(valor)

    if valor is None:
        return None

    mensagem = f"O campo '{campo}' deve ser um número inteiro."

    if isinstance(valor, bool):
        raise ValueError(mensagem)

    try:
        if isinstance(valor, float):
            if not valor.is_integer():
                raise ValueError(mensagem)
            return int(valor)

        return int(valor)

    except (TypeError, ValueError):
        raise ValueError(mensagem)


def converter_valor(campo, valor):
    """Converte para Decimal com 2 casas. Precisa ser > 0."""
    valor = normalizar_texto(valor)

    if valor is None:
        return None

    mensagem = f"O campo '{campo}' deve ser numérico."

    if isinstance(valor, bool):
        raise ValueError(mensagem)

    try:
        if isinstance(valor, str):
            valor = valor.replace(",", ".")

        numero = Decimal(str(valor))
    except InvalidOperation:
        raise ValueError(mensagem)

    if not numero.is_finite():
        raise ValueError(mensagem)

    if abs(numero) >= Decimal("1E8"):
        raise ValueError(f"O campo '{campo}' excede o valor máximo permitido.")

    numero = numero.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if numero <= 0:
        raise ValueError(f"O campo '{campo}' deve ser maior que zero.")

    return numero


def dividir_valor(total, quantidade):
    """
    Divide o total em parcelas de centavos exatos.
    A soma sempre fecha com o total; os centavos que sobram
    vão, 1 a 1, para as primeiras parcelas.
    """
    centavos = int((total * 100).to_integral_value())

    if centavos < quantidade:
        raise ValueError("O valor total é baixo demais para esse número de parcelas.")

    base, resto = divmod(centavos, quantidade)

    return [
        (Decimal(base + (1 if i < resto else 0)) / Decimal(100)).quantize(Decimal("0.01"))
        for i in range(quantidade)
    ]


# ============================================================
# VALIDAÇÃO
# ============================================================

def preparar_dados(data, criando):
    """
    Valida e normaliza os campos ENVIADOS.
    Devolve apenas as chaves presentes em `data`.
    """
    permitidos = CAMPOS_EDITAVEIS | ({"valor_total"} if criando else set())

    desconhecidos = set(data) - permitidos - CAMPOS_SOMENTE_LEITURA

    if desconhecidos:
        raise ValueError(
            "Campos não permitidos: " + ", ".join(sorted(desconhecidos))
        )

    dados = {}

    for campo in permitidos & set(data):
        bruto = data[campo]

        if campo in ("cliente_id", "projeto_id", "numero_parcela", "total_parcelas"):
            dados[campo] = converter_inteiro(campo, bruto)

        elif campo in ("valor", "valor_total"):
            dados[campo] = converter_valor(campo, bruto)

        elif campo in ("data_vencimento", "data_pagamento"):
            dados[campo] = converter_data(campo, bruto)

        elif campo == "status_pagamento":
            dados[campo] = normalizar_opcao(campo, bruto, STATUS_PAGAMENTO)

        elif campo == "tipo_pagamento":
            dados[campo] = normalizar_opcao(campo, bruto, TIPOS_PAGAMENTO)

        elif campo == "forma_pagamento":
            dados[campo] = normalizar_opcao(campo, bruto, FORMAS_PAGAMENTO)

        else:  # observacoes
            texto = normalizar_texto(bruto)

            if texto is not None and not isinstance(texto, str):
                raise ValueError("O campo 'observacoes' deve ser um texto.")

            dados[campo] = texto

    for campo in ("numero_parcela", "total_parcelas"):
        valor = dados.get(campo)

        if valor is not None and not 1 <= valor <= MAX_PARCELAS:
            raise ValueError(
                f"O campo '{campo}' deve estar entre 1 e {MAX_PARCELAS}."
            )

    return dados


def validar_estado(estado, dados):
    """
    Valida o estado FINAL do pagamento (registro atual + alterações) e
    aplica as regras de status/datas. Altera e devolve `estado`.

    `dados` são só os campos enviados na requisição; serve para saber se
    o usuário informou o status ou apenas a data de pagamento.
    """
    if estado.get("cliente_id") is None:
        raise ValueError("O campo 'cliente_id' é obrigatório.")

    if estado.get("valor") is None:
        raise ValueError("O campo 'valor' é obrigatório.")

    if estado.get("data_vencimento") is None:
        raise ValueError("O campo 'data_vencimento' é obrigatório.")

    # ---------------- Cliente e projeto ----------------

    if db.session.get(Cliente, estado["cliente_id"]) is None:
        raise ValueError("Cliente não encontrado.")

    if estado.get("projeto_id") is not None:
        projeto = db.session.get(Projeto, estado["projeto_id"])

        if projeto is None:
            raise ValueError("Projeto não encontrado.")

        if projeto.cliente_id != estado["cliente_id"]:
            raise ValueError("O projeto informado não pertence a este cliente.")

    # ---------------- Parcelas ----------------

    numero = estado.get("numero_parcela")
    total = estado.get("total_parcelas")

    if numero is not None and total is None:
        raise ValueError("Informe 'total_parcelas' junto com 'numero_parcela'.")

    if numero is None and total == 1:
        estado["numero_parcela"] = numero = 1

    if numero is None and total is not None and total > 1:
        raise ValueError("Informe 'numero_parcela' (qual parcela é esta).")

    if numero is not None and numero > total:
        raise ValueError("'numero_parcela' não pode ser maior que 'total_parcelas'.")

    # ---------------- Status e datas ----------------

    status = estado.get("status_pagamento")

    if "status_pagamento" not in dados and dados.get("data_pagamento"):
        status = "Pago"

    if status is None:
        status = "Pendente"

    if status == "Pago":
        estado["data_pagamento"] = estado.get("data_pagamento") or hoje()
    else:
        estado["data_pagamento"] = None

    if status in ("Pendente", "Atrasado"):
        status = "Atrasado" if estado["data_vencimento"] < hoje() else "Pendente"

    estado["status_pagamento"] = status

    return estado


def estado_de(registro):
    return {campo: getattr(registro, campo) for campo in CAMPOS_EDITAVEIS}


def montar_novos_pagamentos(data):
    """Devolve a lista de Pagamento a inserir (1 ou N parcelas)."""
    dados = preparar_dados(data, criando=True)

    valor_total = dados.pop("valor_total", None)
    total = dados.get("total_parcelas")
    numero = dados.get("numero_parcela")

    base = {campo: None for campo in CAMPOS_EDITAVEIS}
    base.update(dados)

    parcelar = total is not None and total > 1 and numero is None

    # ---------------- Pagamento único ou parcela avulsa ----------------

    if not parcelar:
        if valor_total is not None:
            raise ValueError(
                "'valor_total' só é usado para gerar parcelas. "
                "Para um único pagamento, use 'valor'."
            )

        if base["tipo_pagamento"] is None:
            base["tipo_pagamento"] = (
                "Pagamento Único" if total in (None, 1) else "Parcela"
            )

        return [Pagamento(**validar_estado(base, dados))]

    # ---------------- Gerar parcelas ----------------

    if valor_total is None:
        raise ValueError("Informe 'valor_total' para gerar as parcelas.")

    if dados.get("valor") is not None:
        raise ValueError(
            "Ao gerar parcelas, envie 'valor_total'. "
            "'valor' é o valor de uma única parcela."
        )

    if dados.get("data_pagamento") is not None or dados.get("status_pagamento") == "Pago":
        raise ValueError(
            "Parcelas nascem como Pendente. "
            "Registre o pagamento de cada parcela depois."
        )

    if base["data_vencimento"] is None:
        raise ValueError("O campo 'data_vencimento' é obrigatório.")

    if base["tipo_pagamento"] is None:
        base["tipo_pagamento"] = "Parcela"

    registros = []

    for i, valor in enumerate(dividir_valor(valor_total, total), start=1):
        estado = dict(base)
        estado.update(
            valor=valor,
            numero_parcela=i,
            data_vencimento=somar_meses(base["data_vencimento"], i - 1),
        )

        registros.append(Pagamento(**validar_estado(estado, dados)))

    return registros


# ============================================================
# CONSULTAS
# ============================================================

def atualizar_atrasados():
    """
    Marca como Atrasado o que está Pendente e já venceu.
    Roda antes de listar/consultar (sem cron, funciona na Vercel).
    """
    try:
        (
            db.session.query(Pagamento)
            .filter(
                Pagamento.status_pagamento == "Pendente",
                Pagamento.data_vencimento < hoje(),
            )
            .update({"status_pagamento": "Atrasado"}, synchronize_session=False)
        )
        db.session.commit()
    except Exception:
        db.session.rollback()


def aplicar_filtros(query):
    """
    Query string aceita:
      cliente_id, projeto_id
      status            um ou vários separados por vírgula (ex.: Pendente,Atrasado)
      forma_pagamento, tipo_pagamento
      vencimento_de, vencimento_ate      (YYYY-MM-DD)
      pagamento_de,  pagamento_ate       (YYYY-MM-DD)
      busca             cliente, projeto ou observações
    """
    args = request.args

    cliente_id = converter_inteiro("cliente_id", args.get("cliente_id"))
    if cliente_id is not None:
        query = query.filter(Pagamento.cliente_id == cliente_id)

    projeto_id = converter_inteiro("projeto_id", args.get("projeto_id"))
    if projeto_id is not None:
        query = query.filter(Pagamento.projeto_id == projeto_id)

    status = normalizar_texto(args.get("status"))
    if status:
        lista = [
            normalizar_opcao("status", item, STATUS_PAGAMENTO)
            for item in status.split(",")
            if item.strip()
        ]
        query = query.filter(Pagamento.status_pagamento.in_(lista))

    forma = normalizar_opcao("forma_pagamento", args.get("forma_pagamento"), FORMAS_PAGAMENTO)
    if forma:
        query = query.filter(Pagamento.forma_pagamento == forma)

    tipo = normalizar_opcao("tipo_pagamento", args.get("tipo_pagamento"), TIPOS_PAGAMENTO)
    if tipo:
        query = query.filter(Pagamento.tipo_pagamento == tipo)

    intervalos = [
        ("vencimento_de", Pagamento.data_vencimento, ">="),
        ("vencimento_ate", Pagamento.data_vencimento, "<="),
        ("pagamento_de", Pagamento.data_pagamento, ">="),
        ("pagamento_ate", Pagamento.data_pagamento, "<="),
    ]

    for nome, coluna, operador in intervalos:
        limite = converter_data(nome, args.get(nome))

        if limite is not None:
            query = query.filter(coluna >= limite if operador == ">=" else coluna <= limite)

    busca = normalizar_texto(args.get("busca"))
    if busca:
        termo = f"%{busca}%"
        query = (
            query.join(Pagamento.cliente)
            .outerjoin(Pagamento.projeto)
            .filter(
                or_(
                    Cliente.nome_empresa.ilike(termo),
                    Projeto.nome_projeto.ilike(termo),
                    Pagamento.observacoes.ilike(termo),
                )
            )
        )

    return query


def serializar(pagamento):
    dados = pagamento.to_dict()

    dados["dias_atraso"] = (
        (hoje() - pagamento.data_vencimento).days
        if pagamento.status_pagamento == "Atrasado" and pagamento.data_vencimento
        else None
    )

    return dados


def json_erro(mensagem, codigo):
    return jsonify({"erro": mensagem}), codigo


def json_erro_interno(mensagem, excecao):
    return jsonify({"erro": mensagem, "detalhes": str(excecao)}), 500


# ============================================================
# GET - LISTAR
# ============================================================

@pagamentos_bp.route("/", methods=["GET"], strict_slashes=False)
def listar():
    try:
        atualizar_atrasados()

        query = Pagamento.query.options(
            joinedload(Pagamento.cliente),
            joinedload(Pagamento.projeto),
        )

        registros = (
            aplicar_filtros(query)
            .order_by(Pagamento.data_vencimento.desc().nullslast(), Pagamento.id.desc())
            .all()
        )

        return jsonify([serializar(r) for r in registros]), 200

    except ValueError as erro:
        return json_erro(str(erro), 400)

    except Exception as erro:
        return json_erro_interno("Erro ao listar pagamentos.", erro)


# ============================================================
# GET - RESUMO
# ============================================================

@pagamentos_bp.route("/resumo", methods=["GET"], strict_slashes=False)
def resumo():
    try:
        atualizar_atrasados()

        consulta = db.session.query(
            Pagamento.status_pagamento,
            func.count(Pagamento.id),
            func.coalesce(func.sum(Pagamento.valor), 0),
        )

        consulta = aplicar_filtros(consulta).group_by(Pagamento.status_pagamento)

        por_status = {s: {"quantidade": 0, "valor": 0.0} for s in STATUS_PAGAMENTO}

        for status, quantidade, valor in consulta.all():
            por_status[status] = {"quantidade": quantidade, "valor": float(valor)}

        def soma(*status):
            return round(sum(por_status[s]["valor"] for s in status), 2)

        # Recebido no mês corrente (ignora os filtros da tela)
        inicio = hoje().replace(day=1)
        proximo = somar_meses(inicio, 1)

        recebido_mes = (
            db.session.query(func.coalesce(func.sum(Pagamento.valor), 0))
            .filter(
                Pagamento.status_pagamento == "Pago",
                Pagamento.data_pagamento >= inicio,
                Pagamento.data_pagamento < proximo,
            )
            .scalar()
        )

        return jsonify({
            "por_status": por_status,
            "total_a_receber": soma("Pendente", "Atrasado"),
            "total_atrasado": soma("Atrasado"),
            "total_recebido": soma("Pago"),
            "recebido_no_mes": round(float(recebido_mes), 2),
        }), 200

    except ValueError as erro:
        return json_erro(str(erro), 400)

    except Exception as erro:
        return json_erro_interno("Erro ao calcular resumo.", erro)


# ============================================================
# GET - OBTER POR ID
# ============================================================

@pagamentos_bp.route("/<int:id>", methods=["GET"], strict_slashes=False)
def obter(id):
    try:
        atualizar_atrasados()

        registro = db.session.get(Pagamento, id)

        if not registro:
            return json_erro("Pagamento não encontrado.", 404)

        return jsonify(serializar(registro)), 200

    except Exception as erro:
        return json_erro_interno("Erro ao buscar pagamento.", erro)


# ============================================================
# POST - CRIAR
# ============================================================

@pagamentos_bp.route("/", methods=["POST"], strict_slashes=False)
def criar():
    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return json_erro("Nenhum dado enviado.", 400)

    try:
        registros = montar_novos_pagamentos(data)

        db.session.add_all(registros)
        db.session.commit()

        if len(registros) == 1:
            return jsonify(serializar(registros[0])), 201

        return jsonify({
            "total": len(registros),
            "pagamentos": [serializar(r) for r in registros],
        }), 201

    except ValueError as erro:
        db.session.rollback()
        return json_erro(str(erro), 400)

    except Exception as erro:
        db.session.rollback()
        return json_erro_interno("Erro ao criar pagamento.", erro)


# ============================================================
# PUT - ATUALIZAR
# ============================================================

@pagamentos_bp.route("/<int:id>", methods=["PUT"], strict_slashes=False)
def atualizar(id):
    registro = db.session.get(Pagamento, id)

    if not registro:
        return json_erro("Pagamento não encontrado.", 404)

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):
        return json_erro("Nenhum dado enviado.", 400)

    try:
        dados = preparar_dados(data, criando=False)

        if not dados:
            raise ValueError("Nenhum campo válido foi enviado.")

        estado = estado_de(registro)
        estado.update(dados)
        estado = validar_estado(estado, dados)

        for campo in CAMPOS_EDITAVEIS:
            setattr(registro, campo, estado[campo])

        db.session.commit()

        return jsonify(serializar(registro)), 200

    except ValueError as erro:
        db.session.rollback()
        return json_erro(str(erro), 400)

    except Exception as erro:
        db.session.rollback()
        return json_erro_interno("Erro ao atualizar pagamento.", erro)


# ============================================================
# DELETE - EXCLUIR
# ============================================================

@pagamentos_bp.route("/<int:id>", methods=["DELETE"], strict_slashes=False)
def deletar(id):
    registro = db.session.get(Pagamento, id)

    if not registro:
        return json_erro("Pagamento não encontrado.", 404)

    try:
        db.session.delete(registro)
        db.session.commit()

        return jsonify({"msg": "Pagamento deletado com sucesso!"}), 200

    except Exception as erro:
        db.session.rollback()
        return json_erro_interno("Erro ao excluir pagamento.", erro)