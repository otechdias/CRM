"""
Verificação do checklist do módulo Plano Recorrente.

Roda na RAIZ do projeto:

    python -m backend.verificar_planos
    python -m backend.verificar_planos --yes --detalhes --tsc

Opções:
    --yes        não pede confirmação
    --detalhes   mostra todas as verificações (por padrão só as que falharam)
    --tsc        também roda o TypeScript (npx tsc --noEmit) no frontend

ATENÇÃO: usa o banco definido em DATABASE_URL. Cria um cliente temporário
("ZZ_VERIFICACAO_PLANOS") e planos ligados a ele, e apaga tudo ao final.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from backend.app import app
from backend.database import db
from backend.models import Cliente, PlanoRecorrente
from backend.routes.planos import (
    FORMAS_PAGAMENTO,
    NOMES_PLANO,
    STATUS_PLANO,
    TIPOS_COBRANCA,
    calcular_proximo_vencimento,
)


# ============================================================
# CONFIGURAÇÃO
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

MARCADOR = "ZZ_VERIFICACAO_PLANOS"

CAMPOS = [
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
]

# coluna -> início do tipo esperado no PostgreSQL
COLUNAS_ESPERADAS = {
    "id": "INTEGER",
    "cliente_id": "INTEGER",
    "nome_plano": "VARCHAR",
    "valor_mensal": "NUMERIC",
    "dia_cobranca": "INTEGER",
    "status_plano": "VARCHAR",
    "tipo_cobranca": "VARCHAR",
    "data_inicio": "DATE",
    "proximo_vencimento": "DATE",
    "forma_pagamento": "VARCHAR",
    "data_cancelamento": "DATE",
    "motivo_cancelamento": "VARCHAR",
    "observacoes": "TEXT",
    "created_at": "TIMESTAMP",
}

CONSTRAINTS_ESPERADAS = [
    "chk_planos_status",
    "chk_planos_dia_cobranca",
    "chk_planos_valor_mensal",
    "chk_planos_nome",
    "chk_planos_tipo_cobranca",
    "chk_planos_forma_pagamento",
]

ID_INEXISTENTE = 2147483000


# ============================================================
# INFRAESTRUTURA DE VERIFICAÇÃO
# ============================================================

class Verificador:
    def __init__(self):
        self.itens = []
        self.atual = None

    def item(self, nome):
        self.atual = {"nome": nome, "checks": [], "pulado": None}
        self.itens.append(self.atual)

    def check(self, descricao, condicao, detalhe=""):
        ok = bool(condicao)
        self.atual["checks"].append((ok, descricao, detalhe))
        return ok

    def pular(self, motivo):
        self.atual["pulado"] = motivo

    def erro(self, exc):
        self.atual["checks"].append(
            (False, "Executou sem exceção", f"{type(exc).__name__}: {exc}")
        )


def status_item(item):
    if item["pulado"]:
        return "PULADO"

    if item["checks"] and all(ok for ok, _, _ in item["checks"]):
        return "OK"

    return "FALHOU"


class Contexto:
    def __init__(self, http, cliente_id, rodar_tsc):
        self.http = http
        self.cliente_id = cliente_id
        self.rodar_tsc = rodar_tsc

    def req(self, metodo, url, json=None):
        resp = getattr(self.http, metodo)(url, json=json)
        return resp.status_code, resp.get_json(silent=True)

    def criar(self, remover=(), **extra):
        dados = {
            "cliente_id": self.cliente_id,
            "nome_plano": "Plano Pro",
            "valor_mensal": 100,
            "dia_cobranca": 15,
        }
        dados.update(extra)

        for chave in remover:
            dados.pop(chave, None)

        return self.req("post", "/planos/", dados)


def campo(corpo, chave):
    return corpo.get(chave) if isinstance(corpo, dict) else None


def testar_api(
    v,
    ctx,
    descricao,
    deve_aceitar,
    esperado=None,
    chave=None,
    remover=(),
    **extra
):
    """
    POST /planos/ e confere:
      deve_aceitar=True  -> 201 (e, se informado, corpo[chave] == esperado)
      deve_aceitar=False -> 400
    Retorna o corpo da resposta.
    """
    status, corpo = ctx.criar(remover=remover, **extra)

    if deve_aceitar:
        ok = status == 201 and (
            chave is None or campo(corpo, chave) == esperado
        )
        detalhe = f"HTTP {status}: {corpo}"

        if ok is False and chave and status == 201:
            detalhe = (
                f"{chave} = {campo(corpo, chave)!r} "
                f"(esperado {esperado!r})"
            )
    else:
        ok = status == 400
        detalhe = f"HTTP {status} (esperado 400): {corpo}"

    v.check(descricao, ok, "" if ok else detalhe)

    return corpo


def banco_aceita(cliente_id, **campos):
    """
    Insere direto no banco (sem passar pela API) e desfaz.
    Retorna (aceitou, mensagem_de_erro).
    """
    dados = {
        "cliente_id": cliente_id,
        "nome_plano": "Plano Pro",
        "valor_mensal": 10,
        "dia_cobranca": 10,
        "status_plano": "Ativo",
        "tipo_cobranca": "Mensal",
    }
    dados.update(campos)

    with app.app_context():
        try:
            db.session.add(PlanoRecorrente(**dados))
            db.session.flush()
            return True, ""
        except SQLAlchemyError as exc:
            mensagem = str(getattr(exc, "orig", exc)).strip()
            return False, mensagem.splitlines()[0] if mensagem else ""
        finally:
            db.session.rollback()


def limpar():
    """Apaga o cliente de teste e os planos ligados a ele."""
    with app.app_context():
        ids = [
            c.id
            for c in Cliente.query.filter_by(nome_empresa=MARCADOR).all()
        ]

        if ids:
            (
                PlanoRecorrente.query
                .filter(PlanoRecorrente.cliente_id.in_(ids))
                .delete(synchronize_session=False)
            )
            (
                Cliente.query
                .filter(Cliente.id.in_(ids))
                .delete(synchronize_session=False)
            )
            db.session.commit()


def criar_cliente_teste():
    with app.app_context():
        cliente = Cliente(nome_empresa=MARCADOR)
        db.session.add(cliente)
        db.session.commit()
        return cliente.id


# ============================================================
# 1. BANCO
# ============================================================

def secao_banco(v, ctx):
    with app.app_context():
        insp = inspect(db.engine)

        existe = insp.has_table("planos_recorrentes")
        v.check("Tabela planos_recorrentes existe", existe)

        if not existe:
            return

        colunas = {
            c["name"]: c
            for c in insp.get_columns("planos_recorrentes")
        }

        faltando = [c for c in COLUNAS_ESPERADAS if c not in colunas]
        v.check(
            "Todas as colunas existem",
            not faltando,
            "faltando: " + ", ".join(faltando),
        )

        erradas = []

        for nome, prefixo in COLUNAS_ESPERADAS.items():
            if nome in colunas:
                tipo = str(colunas[nome]["type"]).upper()

                if not tipo.startswith(prefixo):
                    erradas.append(f"{nome} é {tipo} (esperado {prefixo})")

        v.check(
            "Tipos das colunas corretos",
            not erradas,
            "; ".join(erradas),
        )

        fks = insp.get_foreign_keys("planos_recorrentes")
        v.check(
            "FK cliente_id -> clientes(id)",
            any(
                fk["referred_table"] == "clientes"
                and "cliente_id" in fk["constrained_columns"]
                for fk in fks
            ),
        )

        existentes = {
            c["name"]
            for c in insp.get_check_constraints("planos_recorrentes")
        }

        faltam = [c for c in CONSTRAINTS_ESPERADAS if c not in existentes]
        v.check(
            "Constraints CHECK esperadas existem",
            not faltam,
            "faltando: " + ", ".join(faltam),
        )

        extras = sorted(existentes - set(CONSTRAINTS_ESPERADAS))
        v.check(
            "Sem constraints CHECK antigas/desconhecidas",
            not extras,
            "encontradas: " + ", ".join(extras),
        )


# ============================================================
# 2. MODEL
# ============================================================

def secao_model(v, ctx):
    v.check(
        "__tablename__ = planos_recorrentes",
        PlanoRecorrente.__tablename__ == "planos_recorrentes",
    )

    faltando = [c for c in CAMPOS if not hasattr(PlanoRecorrente, c)]
    v.check(
        "Model tem todos os campos do checklist",
        not faltando,
        "faltando: " + ", ".join(faltando),
    )

    v.check("Model tem created_at", hasattr(PlanoRecorrente, "created_at"))

    v.check(
        "Relacionamentos Cliente.planos e PlanoRecorrente.cliente",
        hasattr(Cliente, "planos") and hasattr(PlanoRecorrente, "cliente"),
    )

    chaves = set(PlanoRecorrente().to_dict().keys())
    esperadas = set(CAMPOS) | {"id", "cliente_nome", "created_at"}

    v.check(
        "to_dict() devolve todos os campos",
        esperadas <= chaves,
        "faltando: " + ", ".join(sorted(esperadas - chaves)),
    )


# ============================================================
# 3. CLIENTE RELACIONADO
# ============================================================

def secao_cliente(v, ctx):
    status, corpo = ctx.criar()

    v.check(
        "POST com cliente válido retorna 201",
        status == 201,
        f"HTTP {status}: {corpo}",
    )
    v.check(
        "Resposta traz cliente_nome",
        campo(corpo, "cliente_nome") == MARCADOR,
        f"cliente_nome = {campo(corpo, 'cliente_nome')!r}",
    )

    testar_api(v, ctx, "Cliente inexistente retorna 400", False,
               cliente_id=ID_INEXISTENTE)
    testar_api(v, ctx, "Sem cliente_id retorna 400", False,
               remover=("cliente_id",))
    testar_api(v, ctx, "cliente_id inválido ('abc') retorna 400", False,
               cliente_id="abc")

    with app.app_context():
        cliente = db.session.get(Cliente, ctx.cliente_id)
        planos = cliente.planos

        v.check("Cliente.planos lista os planos do cliente", len(planos) >= 1)
        v.check(
            "PlanoRecorrente.cliente aponta para o cliente",
            bool(planos) and planos[0].cliente.id == ctx.cliente_id,
        )

    status, lista = ctx.req("get", f"/planos/?cliente_id={ctx.cliente_id}")
    v.check(
        "GET ?cliente_id filtra pelo cliente",
        status == 200
        and isinstance(lista, list)
        and len(lista) >= 1
        and all(p["cliente_id"] == ctx.cliente_id for p in lista),
    )

    aceitou, msg = banco_aceita(ctx.cliente_id)
    v.check("Banco aceita cliente_id válido", aceitou, msg)

    aceitou, _ = banco_aceita(ID_INEXISTENTE)
    v.check("Banco recusa cliente_id inexistente (FK)", not aceitou)


# ============================================================
# 4. NOME DO PLANO
# ============================================================

def secao_nome(v, ctx):
    for nome in NOMES_PLANO:
        testar_api(v, ctx, f"API aceita '{nome}'", True,
                   nome, "nome_plano", nome_plano=nome)

    testar_api(v, ctx, "API aceita minúsculas e padroniza ('plano pro')",
               True, "Plano Pro", "nome_plano", nome_plano="plano pro")
    testar_api(v, ctx, "API recusa nome fora da lista", False,
               nome_plano="Plano Inexistente")
    testar_api(v, ctx, "API recusa nome ausente", False,
               remover=("nome_plano",))

    for nome in NOMES_PLANO:
        aceitou, msg = banco_aceita(ctx.cliente_id, nome_plano=nome)
        v.check(f"Banco aceita '{nome}'", aceitou, msg)

    aceitou, _ = banco_aceita(ctx.cliente_id, nome_plano="Plano Inexistente")
    v.check("Banco recusa nome fora da lista", not aceitou)


# ============================================================
# 5. VALOR MENSAL
# ============================================================

def secao_valor(v, ctx):
    testar_api(v, ctx, "Aceita 299.9", True, 299.9,
               "valor_mensal", valor_mensal=299.9)
    testar_api(v, ctx, "Aceita '199,90' (vírgula)", True, 199.9,
               "valor_mensal", valor_mensal="199,90")
    testar_api(v, ctx, "Aceita 0", True, 0.0,
               "valor_mensal", valor_mensal=0)

    testar_api(v, ctx, "Recusa valor negativo", False, valor_mensal=-10)
    testar_api(v, ctx, "Recusa texto ('abc')", False, valor_mensal="abc")
    testar_api(v, ctx, "Recusa valor nulo", False, valor_mensal=None)
    testar_api(v, ctx, "Recusa valor ausente", False,
               remover=("valor_mensal",))
    testar_api(v, ctx, "Recusa valor acima do limite (100000000)", False,
               valor_mensal=100000000)

    aceitou, msg = banco_aceita(ctx.cliente_id, valor_mensal=10)
    v.check("Banco aceita valor positivo", aceitou, msg)

    aceitou, _ = banco_aceita(ctx.cliente_id, valor_mensal=-1)
    v.check("Banco recusa valor negativo", not aceitou)


# ============================================================
# 6. DIA DE COBRANÇA
# ============================================================

def secao_dia(v, ctx):
    testar_api(v, ctx, "Aceita dia 1", True, 1,
               "dia_cobranca", dia_cobranca=1)
    testar_api(v, ctx, "Aceita dia 31", True, 31,
               "dia_cobranca", dia_cobranca=31)

    testar_api(v, ctx, "Recusa dia 0", False, dia_cobranca=0)
    testar_api(v, ctx, "Recusa dia 32", False, dia_cobranca=32)
    testar_api(v, ctx, "Recusa texto ('abc')", False, dia_cobranca="abc")
    testar_api(v, ctx, "Recusa decimal (10.5)", False, dia_cobranca=10.5)
    testar_api(v, ctx, "Recusa dia ausente", False,
               remover=("dia_cobranca",))

    for dia in (1, 31):
        aceitou, msg = banco_aceita(ctx.cliente_id, dia_cobranca=dia)
        v.check(f"Banco aceita dia {dia}", aceitou, msg)

    for dia in (0, 32):
        aceitou, _ = banco_aceita(ctx.cliente_id, dia_cobranca=dia)
        v.check(f"Banco recusa dia {dia}", not aceitou)


# ============================================================
# 7. STATUS
# ============================================================

def secao_status(v, ctx):
    testar_api(v, ctx, "Padrão é 'Ativo' quando não informado", True,
               "Ativo", "status_plano")
    testar_api(v, ctx, "Aceita 'Ativo'", True, "Ativo",
               "status_plano", status_plano="Ativo")
    testar_api(v, ctx, "Aceita 'Pausado'", True, "Pausado",
               "status_plano", status_plano="Pausado")
    testar_api(v, ctx, "Aceita 'Cancelado' (com motivo)", True, "Cancelado",
               "status_plano", status_plano="Cancelado",
               motivo_cancelamento="Teste")

    testar_api(v, ctx, "Formato antigo 'pausado' vira 'Pausado'", True,
               "Pausado", "status_plano", status_plano="pausado")
    testar_api(v, ctx, "Formato antigo 'inativo' vira 'Cancelado'", True,
               "Cancelado", "status_plano", status_plano="inativo",
               motivo_cancelamento="Teste")

    testar_api(v, ctx, "Recusa status inválido", False,
               status_plano="Qualquer")

    for status in STATUS_PLANO:
        aceitou, msg = banco_aceita(ctx.cliente_id, status_plano=status)
        v.check(f"Banco aceita '{status}'", aceitou, msg)

    aceitou, _ = banco_aceita(ctx.cliente_id, status_plano="Qualquer")
    v.check("Banco recusa status inválido", not aceitou)


# ============================================================
# 8. TIPO DE COBRANÇA
# ============================================================

def secao_tipo(v, ctx):
    testar_api(v, ctx, "Padrão é 'Mensal' quando não informado", True,
               "Mensal", "tipo_cobranca")

    for tipo in TIPOS_COBRANCA:
        testar_api(v, ctx, f"API aceita '{tipo}'", True, tipo,
                   "tipo_cobranca", tipo_cobranca=tipo)

    testar_api(v, ctx, "API recusa tipo inválido", False,
               tipo_cobranca="Quinzenal")

    for tipo in TIPOS_COBRANCA:
        aceitou, msg = banco_aceita(ctx.cliente_id, tipo_cobranca=tipo)
        v.check(f"Banco aceita '{tipo}'", aceitou, msg)

    aceitou, _ = banco_aceita(ctx.cliente_id, tipo_cobranca="Quinzenal")
    v.check("Banco recusa tipo inválido", not aceitou)


# ============================================================
# 9. DATA DE INÍCIO
# ============================================================

def secao_data_inicio(v, ctx):
    testar_api(v, ctx, "Padrão é a data de hoje", True,
               date.today().isoformat(), "data_inicio")
    testar_api(v, ctx, "Aceita data informada (2026-01-15)", True,
               "2026-01-15", "data_inicio", data_inicio="2026-01-15")
    testar_api(v, ctx, "Recusa formato inválido (15/01/2026)", False,
               data_inicio="15/01/2026")
    testar_api(v, ctx, "Recusa data inexistente (2026-02-30)", False,
               data_inicio="2026-02-30")


# ============================================================
# 10. PRÓXIMO VENCIMENTO
# ============================================================

def secao_vencimento(v, ctx):
    hoje = date.today()
    esperado = calcular_proximo_vencimento(15, hoje).isoformat()

    corpo = testar_api(v, ctx, "Calcula automaticamente pelo dia (15)", True,
                       esperado, "proximo_vencimento", dia_cobranca=15)

    testar_api(v, ctx, "Mantém vencimento informado (2030-05-20)", True,
               "2030-05-20", "proximo_vencimento",
               proximo_vencimento="2030-05-20")

    corpo31 = testar_api(v, ctx, "Aceita dia 31 sem quebrar o cálculo", True,
                         dia_cobranca=31)
    try:
        vencimento = date.fromisoformat(campo(corpo31, "proximo_vencimento"))
        v.check("Vencimento do dia 31 é uma data válida >= hoje",
                vencimento >= hoje, str(vencimento))
    except (TypeError, ValueError):
        v.check("Vencimento do dia 31 é uma data válida >= hoje", False,
                str(campo(corpo31, "proximo_vencimento")))

    testar_api(v, ctx, "Cancelado fica sem próximo vencimento", True,
               None, "proximo_vencimento", status_plano="Cancelado",
               motivo_cancelamento="Teste", proximo_vencimento="2030-05-20")

    testar_api(v, ctx, "Recusa formato inválido (20/05/2030)", False,
               proximo_vencimento="20/05/2030")

    plano_id = campo(corpo, "id")

    if plano_id:
        ctx.req("put", f"/planos/{plano_id}",
                {"proximo_vencimento": "2030-05-20"})
        status, atualizado = ctx.req("put", f"/planos/{plano_id}",
                                     {"proximo_vencimento": ""})
        v.check(
            "PUT com vencimento vazio recalcula",
            status == 200
            and campo(atualizado, "proximo_vencimento") == esperado,
            f"HTTP {status}: {campo(atualizado, 'proximo_vencimento')}",
        )

    ok = (
        calcular_proximo_vencimento(31, date(2026, 2, 10)) == date(2026, 2, 28)
        and calcular_proximo_vencimento(5, date(2026, 12, 10))
        == date(2027, 1, 5)
        and calcular_proximo_vencimento(10, date(2026, 3, 10))
        == date(2026, 3, 10)
    )
    v.check("Função de cálculo: fevereiro, virada de ano e mesmo dia", ok)


# ============================================================
# 11. FORMA DE PAGAMENTO
# ============================================================

def secao_forma(v, ctx):
    testar_api(v, ctx, "Opcional: sem forma de pagamento fica vazio", True,
               None, "forma_pagamento")

    for forma in FORMAS_PAGAMENTO:
        testar_api(v, ctx, f"API aceita '{forma}'", True, forma,
                   "forma_pagamento", forma_pagamento=forma)

    testar_api(v, ctx, "API recusa forma inválida", False,
               forma_pagamento="Fiado")

    for forma in FORMAS_PAGAMENTO:
        aceitou, msg = banco_aceita(ctx.cliente_id, forma_pagamento=forma)
        v.check(f"Banco aceita '{forma}'", aceitou, msg)

    aceitou, _ = banco_aceita(ctx.cliente_id, forma_pagamento="Fiado")
    v.check("Banco recusa forma inválida", not aceitou)


# ============================================================
# 12. CANCELAMENTO
# ============================================================

def secao_cancelamento(v, ctx):
    hoje = date.today().isoformat()

    corpo = testar_api(v, ctx, "Cria plano ativo para testar", True)
    plano_id = campo(corpo, "id")

    if not plano_id:
        return

    status, _ = ctx.req("put", f"/planos/{plano_id}",
                        {"status_plano": "Cancelado"})
    v.check("Cancelar sem motivo retorna 400", status == 400, f"HTTP {status}")

    status, corpo = ctx.req("put", f"/planos/{plano_id}", {
        "status_plano": "Cancelado",
        "motivo_cancelamento": "Preço",
    })
    v.check("Cancelar com motivo retorna 200", status == 200,
            f"HTTP {status}: {corpo}")
    v.check("Status vira 'Cancelado'",
            campo(corpo, "status_plano") == "Cancelado")
    v.check("Motivo é salvo",
            campo(corpo, "motivo_cancelamento") == "Preço")
    v.check("Data de cancelamento vira hoje",
            campo(corpo, "data_cancelamento") == hoje,
            str(campo(corpo, "data_cancelamento")))
    v.check("Próximo vencimento é zerado",
            campo(corpo, "proximo_vencimento") is None)

    status, corpo = ctx.req("put", f"/planos/{plano_id}",
                            {"status_plano": "Ativo"})
    v.check("Reativar retorna 200", status == 200, f"HTTP {status}: {corpo}")
    v.check("Reativar limpa data e motivo do cancelamento",
            campo(corpo, "data_cancelamento") is None
            and campo(corpo, "motivo_cancelamento") is None)
    v.check("Reativar recalcula o próximo vencimento",
            campo(corpo, "proximo_vencimento") is not None)

    futuro = testar_api(v, ctx, "Cria plano com início futuro", True,
                        data_inicio="2030-01-01")

    status, _ = ctx.req("put", f"/planos/{campo(futuro, 'id')}", {
        "status_plano": "Cancelado",
        "motivo_cancelamento": "Teste",
        "data_cancelamento": "2029-01-01",
    })
    v.check("Cancelamento antes do início retorna 400", status == 400,
            f"HTTP {status}")

    testar_api(v, ctx, "POST já cancelado sem motivo retorna 400", False,
               status_plano="Cancelado")
    testar_api(v, ctx, "POST já cancelado com motivo retorna 201", True,
               "Cancelado", "status_plano", status_plano="Cancelado",
               motivo_cancelamento="Teste")
    testar_api(v, ctx, "Motivo com mais de 150 caracteres retorna 400", False,
               status_plano="Cancelado", motivo_cancelamento="x" * 151)


# ============================================================
# 13. GET
# ============================================================

def secao_get(v, ctx):
    p1 = testar_api(v, ctx, "Cria plano ativo", True,
                    nome_plano="Plano Essencial")
    p2 = testar_api(v, ctx, "Cria plano cancelado", True,
                    status_plano="Cancelado", motivo_cancelamento="Teste")

    id1, id2 = campo(p1, "id"), campo(p2, "id")

    status, lista = ctx.req("get", "/planos/")
    v.check("GET /planos/ retorna 200 e uma lista",
            status == 200 and isinstance(lista, list), f"HTTP {status}")

    if isinstance(lista, list):
        ids = [p["id"] for p in lista]

        v.check("Lista contém os planos criados", id1 in ids and id2 in ids)
        v.check("Lista ordenada do mais novo para o mais antigo",
                ids == sorted(ids, reverse=True))

        faltando = (
            [c for c in CAMPOS + ["id", "cliente_nome"] if c not in lista[0]]
            if lista else []
        )
        v.check("Itens trazem todos os campos", not faltando,
                "faltando: " + ", ".join(faltando))

    status, lista = ctx.req("get", "/planos/?status_plano=Cancelado")
    ids = [p["id"] for p in lista] if isinstance(lista, list) else []
    v.check(
        "Filtro ?status_plano=Cancelado funciona",
        status == 200
        and id2 in ids
        and id1 not in ids
        and all(p["status_plano"] == "Cancelado" for p in lista),
    )

    status, lista = ctx.req("get", f"/planos/?cliente_id={ctx.cliente_id}")
    v.check(
        "Filtro ?cliente_id funciona",
        status == 200
        and isinstance(lista, list)
        and all(p["cliente_id"] == ctx.cliente_id for p in lista),
    )

    status, corpo = ctx.req("get", f"/planos/{id1}")
    v.check("GET /planos/<id> retorna 200 com o plano",
            status == 200 and campo(corpo, "id") == id1,
            f"HTTP {status}")

    status, _ = ctx.req("get", f"/planos/{ID_INEXISTENTE}")
    v.check("GET de id inexistente retorna 404", status == 404,
            f"HTTP {status}")


# ============================================================
# 14. POST
# ============================================================

def secao_post(v, ctx):
    status, corpo = ctx.criar()

    v.check("POST válido retorna 201", status == 201, f"HTTP {status}: {corpo}")
    v.check("Resposta traz o id do plano",
            isinstance(campo(corpo, "id"), int))

    plano_id = campo(corpo, "id")

    if plano_id:
        with app.app_context():
            v.check("Plano foi gravado no banco",
                    db.session.get(PlanoRecorrente, plano_id) is not None)

    status, _ = ctx.req("post", "/planos/", {})
    v.check("Corpo vazio retorna 400", status == 400, f"HTTP {status}")

    status, _ = ctx.req("post", "/planos/", [1, 2, 3])
    v.check("Corpo que não é objeto retorna 400", status == 400,
            f"HTTP {status}")

    resp = ctx.http.post("/planos/", data="isso não é json",
                         content_type="application/json")
    v.check("JSON inválido retorna 400", resp.status_code == 400,
            f"HTTP {resp.status_code}")


# ============================================================
# 15. PUT
# ============================================================

def secao_put(v, ctx):
    corpo = testar_api(v, ctx, "Cria plano para atualizar", True)
    plano_id = campo(corpo, "id")

    if not plano_id:
        return

    status, atual = ctx.req("put", f"/planos/{plano_id}", {
        "valor_mensal": 399.9,
        "forma_pagamento": "PIX",
        "tipo_cobranca": "Trimestral",
    })
    v.check("PUT parcial retorna 200", status == 200, f"HTTP {status}: {atual}")
    v.check("Campos enviados foram alterados",
            campo(atual, "valor_mensal") == 399.9
            and campo(atual, "forma_pagamento") == "PIX"
            and campo(atual, "tipo_cobranca") == "Trimestral")
    v.check("Campos não enviados foram preservados",
            campo(atual, "nome_plano") == "Plano Pro"
            and campo(atual, "dia_cobranca") == 15)

    status, atual = ctx.req("put", f"/planos/{plano_id}", {
        "id": ID_INEXISTENTE,
        "cliente_nome": "Outro nome",
        "created_at": "2000-01-01",
        "valor_mensal": 350,
    })
    v.check(
        "Ignora id, cliente_nome e created_at enviados",
        status == 200
        and campo(atual, "id") == plano_id
        and campo(atual, "cliente_nome") == MARCADOR
        and campo(atual, "valor_mensal") == 350,
        f"HTTP {status}: {atual}",
    )

    status, gravado = ctx.req("get", f"/planos/{plano_id}")
    v.check("Alteração persistiu no banco",
            status == 200 and campo(gravado, "valor_mensal") == 350)

    status, _ = ctx.req("put", f"/planos/{plano_id}", {"valor_mensal": -5})
    v.check("Valor inválido retorna 400", status == 400, f"HTTP {status}")

    status, gravado = ctx.req("get", f"/planos/{plano_id}")
    v.check("Erro não altera o plano",
            campo(gravado, "valor_mensal") == 350)

    status, _ = ctx.req("put", f"/planos/{plano_id}",
                        {"cliente_id": ID_INEXISTENTE})
    v.check("Trocar para cliente inexistente retorna 400", status == 400,
            f"HTTP {status}")

    status, _ = ctx.req("put", f"/planos/{plano_id}", {})
    v.check("Corpo vazio retorna 400", status == 400, f"HTTP {status}")

    status, _ = ctx.req("put", f"/planos/{ID_INEXISTENTE}",
                        {"valor_mensal": 100})
    v.check("PUT de id inexistente retorna 404", status == 404,
            f"HTTP {status}")


# ============================================================
# 16. DELETE
# ============================================================

def secao_delete(v, ctx):
    corpo = testar_api(v, ctx, "Cria plano para excluir", True)
    plano_id = campo(corpo, "id")

    if not plano_id:
        return

    status, _ = ctx.req("delete", f"/planos/{plano_id}")
    v.check("DELETE retorna 200", status == 200, f"HTTP {status}")

    status, _ = ctx.req("get", f"/planos/{plano_id}")
    v.check("GET depois de excluir retorna 404", status == 404,
            f"HTTP {status}")

    with app.app_context():
        v.check("Plano foi removido do banco",
                db.session.get(PlanoRecorrente, plano_id) is None)

    status, _ = ctx.req("delete", f"/planos/{plano_id}")
    v.check("DELETE repetido retorna 404", status == 404, f"HTTP {status}")

    status, _ = ctx.req("delete", f"/planos/{ID_INEXISTENTE}")
    v.check("DELETE de id inexistente retorna 404", status == 404,
            f"HTTP {status}")


# ============================================================
# 17. TESTES
# ============================================================

def secao_testes(v, ctx):
    arquivo = ROOT / "backend" / "tests" / "test_planos.py"

    existe = arquivo.exists()
    v.check("Arquivo backend/tests/test_planos.py existe", existe)

    if not existe:
        return

    conteudo = arquivo.read_text(encoding="utf-8")
    quantidade = len(re.findall(r"^def test_", conteudo, re.M))
    v.check(f"Arquivo tem testes ({quantidade} encontrados)", quantidade >= 1)

    proc = subprocess.run(
        [
            sys.executable, "-m", "pytest", str(arquivo),
            "-q", "--no-header", "-p", "no:cacheprovider",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )

    saida = (proc.stdout or "") + (proc.stderr or "")

    if "No module named pytest" in saida:
        v.check("pytest instalado (pip install pytest)", False)
        return

    ultimas = " | ".join(
        [linha for linha in saida.strip().splitlines() if linha][-6:]
    )

    v.check("pytest: todos os testes passaram", proc.returncode == 0, ultimas)


# ============================================================
# 18. FRONTEND
# ============================================================

def secao_frontend(v, ctx):
    pagina = ROOT / "frontend" / "app" / "crm" / "planos" / "page.tsx"
    navbar = ROOT / "frontend" / "components" / "Navbar.tsx"

    existe = pagina.exists()
    v.check("frontend/app/crm/planos/page.tsx existe", existe)

    if not existe:
        return

    codigo = pagina.read_text(encoding="utf-8")

    v.check("É client component ('use client')",
            codigo.lstrip().startswith('"use client"'))

    for metodo in ("get", "post", "put", "delete"):
        v.check(
            f"Chama api.{metodo} em /planos/",
            re.search(rf"api\.{metodo}\(\s*[`\"']/planos/", codigo)
            is not None,
        )

    v.check("Carrega clientes (api.get /clientes/)",
            re.search(r"api\.get\(\s*[`\"']/clientes/", codigo) is not None)

    faltando = [c for c in CAMPOS if c not in codigo]
    v.check("Página usa todos os campos do checklist", not faltando,
            "faltando: " + ", ".join(faltando))

    listas = {
        "nomes de plano": NOMES_PLANO,
        "status": STATUS_PLANO,
        "tipos de cobrança": TIPOS_COBRANCA,
        "formas de pagamento": FORMAS_PAGAMENTO,
    }

    for nome, valores in listas.items():
        ausentes = [x for x in valores if f'"{x}"' not in codigo]
        v.check(f"Opções de {nome} iguais às do backend", not ausentes,
                "faltando no frontend: " + ", ".join(ausentes))

    v.check("Navbar tem link para /crm/planos",
            navbar.exists()
            and "/crm/planos" in navbar.read_text(encoding="utf-8"))

    if not ctx.rodar_tsc:
        return

    frontend = ROOT / "frontend"
    npx = shutil.which("npx")

    if not npx or not (frontend / "node_modules").exists():
        v.check("TypeScript: npx e node_modules disponíveis "
                "(rode npm install em frontend/)", False)
        return

    proc = subprocess.run(
        [npx, "tsc", "--noEmit", "-p", "."],
        cwd=frontend,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=300,
    )

    linhas = [
        linha
        for linha in ((proc.stdout or "") + (proc.stderr or "")).splitlines()
        if "planos/page.tsx" in linha.replace("\\", "/")
    ]

    v.check("TypeScript sem erros em planos/page.tsx", not linhas,
            " | ".join(linhas[:5]))


# ============================================================
# EXECUÇÃO
# ============================================================

SECOES = [
    ("Banco", secao_banco),
    ("Model `PlanoRecorrente`", secao_model),
    ("Cliente relacionado", secao_cliente),
    ("Nome do plano", secao_nome),
    ("Valor mensal", secao_valor),
    ("Dia de cobrança", secao_dia),
    ("Status", secao_status),
    ("Tipo de cobrança", secao_tipo),
    ("Data início", secao_data_inicio),
    ("Próximo vencimento", secao_vencimento),
    ("Forma de pagamento", secao_forma),
    ("Cancelamento", secao_cancelamento),
    ("GET", secao_get),
    ("POST", secao_post),
    ("PUT", secao_put),
    ("DELETE", secao_delete),
    ("Testes", secao_testes),
    ("Frontend", secao_frontend),
]


def imprimir(v, detalhes):
    print("\n" + "=" * 64)
    print("RESULTADO")
    print("=" * 64)

    for item in v.itens:
        print(f"[{status_item(item):<6}] {item['nome']}")

        for ok, descricao, detalhe in item["checks"]:
            if detalhes or not ok:
                marca = "ok" if ok else "X "
                extra = f"  ->  {detalhe}" if (detalhe and not ok) else ""
                print(f"           [{marca}] {descricao}{extra}")

        if item["pulado"]:
            print(f"           (pulado: {item['pulado']})")

    print("\n" + "-" * 64)
    print("CHECKLIST")
    print("-" * 64)

    for item in v.itens:
        marca = "x" if status_item(item) == "OK" else " "
        print(f"* [{marca}] {item['nome']}")

    total = len(v.itens)
    ok = sum(1 for i in v.itens if status_item(i) == "OK")
    falhas = sum(1 for i in v.itens if status_item(i) == "FALHOU")
    pulados = sum(1 for i in v.itens if status_item(i) == "PULADO")

    print(f"\nResumo: {ok}/{total} itens OK | {falhas} falharam "
          f"| {pulados} pulados")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    parser.add_argument("--detalhes", action="store_true")
    parser.add_argument("--tsc", action="store_true")
    args = parser.parse_args()

    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    uri = app.config.get("SQLALCHEMY_DATABASE_URI")

    if not uri:
        print("DATABASE_URL não está definida (.env).")
        return 2

    print("Banco alvo:", make_url(uri).render_as_string(hide_password=True))
    print(f"Será criado e apagado um cliente temporário '{MARCADOR}'.")

    if not args.yes:
        if input("Digite SIM para continuar: ").strip().upper() != "SIM":
            print("Cancelado.")
            return 1

    try:
        with app.app_context():
            db.session.execute(text("SELECT 1"))
    except Exception as exc:
        print(f"Não foi possível conectar ao banco: {exc}")
        return 2

    limpar()

    cliente_id = criar_cliente_teste()
    ctx = Contexto(app.test_client(), cliente_id, args.tsc)
    v = Verificador()

    try:
        for nome, funcao in SECOES:
            print(f"Verificando: {nome} ...", flush=True)
            v.item(nome)

            try:
                funcao(v, ctx)
            except Exception as exc:
                v.erro(exc)
    finally:
        limpar()

    imprimir(v, args.detalhes)

    todos_ok = all(status_item(i) != "FALHOU" for i in v.itens)

    return 0 if todos_ok else 1


if __name__ == "__main__":
    sys.exit(main())