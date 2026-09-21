"""
Testes da API de pagamentos.

Rodar na raiz do projeto (a pasta que contém "backend"):
    pip install pytest
    python -m pytest backend/tests -v

Usa SQLite em memória, então não toca no Supabase. Só as tabelas
clientes, projetos e pagamentos são criadas (a tabela de leads usa
ARRAY do PostgreSQL, que o SQLite não suporta).
"""

import os

# Precisa vir ANTES de importar backend.app
os.environ["DATABASE_URL"] = "sqlite://"

from datetime import date, timedelta

import pytest

from backend.app import app as flask_app
from backend.database import db
from backend.models import Cliente, Pagamento, Projeto

TABELAS = [Cliente.__table__, Projeto.__table__, Pagamento.__table__]


def em_dias(n):
    return (date.today() + timedelta(days=n)).isoformat()


@pytest.fixture
def ambiente():
    flask_app.config["TESTING"] = True

    with flask_app.app_context():
        db.metadata.create_all(bind=db.engine, tables=TABELAS)

        cliente = Cliente(nome_empresa="Padaria do Zé")
        outro = Cliente(nome_empresa="Oficina Central")
        db.session.add_all([cliente, outro])
        db.session.flush()

        projeto = Projeto(cliente_id=cliente.id, nome_projeto="Site institucional")
        db.session.add(projeto)
        db.session.commit()

        ids = {"cliente": cliente.id, "outro_cliente": outro.id, "projeto": projeto.id}

    yield flask_app.test_client(), ids

    with flask_app.app_context():
        db.session.remove()
        db.metadata.drop_all(bind=db.engine, tables=TABELAS)


def corpo(ids, **extra):
    base = {
        "cliente_id": ids["cliente"],
        "valor": 500,
        "data_vencimento": em_dias(30),
        "forma_pagamento": "Pix",
    }
    base.update(extra)
    return base


# ------------------------------------------------------------
# POST
# ------------------------------------------------------------

def test_criar_pagamento_simples(ambiente):
    client, ids = ambiente

    r = client.post(
        "/pagamentos/",
        json=corpo(ids, projeto_id=ids["projeto"], tipo_pagamento="entrada"),
    )

    assert r.status_code == 201
    body = r.get_json()
    assert body["status_pagamento"] == "Pendente"
    assert body["valor"] == 500
    assert body["tipo_pagamento"] == "Entrada"
    assert body["forma_pagamento"] == "Pix"
    assert body["cliente_nome"] == "Padaria do Zé"
    assert body["projeto_nome"] == "Site institucional"
    assert body["data_pagamento"] is None


def test_sem_tipo_vira_pagamento_unico(ambiente):
    client, ids = ambiente

    body = client.post("/pagamentos/", json=corpo(ids)).get_json()

    assert body["tipo_pagamento"] == "Pagamento Único"


@pytest.mark.parametrize("valor", [0, -10, "abc", None])
def test_valor_invalido(ambiente, valor):
    client, ids = ambiente

    r = client.post("/pagamentos/", json=corpo(ids, valor=valor))

    assert r.status_code == 400


def test_valor_com_virgula(ambiente):
    client, ids = ambiente

    body = client.post("/pagamentos/", json=corpo(ids, valor="299,90")).get_json()

    assert body["valor"] == 299.90


def test_vencimento_obrigatorio(ambiente):
    client, ids = ambiente
    dados = corpo(ids)
    del dados["data_vencimento"]

    assert client.post("/pagamentos/", json=dados).status_code == 400


def test_cliente_inexistente(ambiente):
    client, ids = ambiente

    r = client.post("/pagamentos/", json=corpo(ids, cliente_id=99999))

    assert r.status_code == 400
    assert "Cliente" in r.get_json()["erro"]


def test_projeto_de_outro_cliente(ambiente):
    client, ids = ambiente

    r = client.post(
        "/pagamentos/",
        json=corpo(ids, cliente_id=ids["outro_cliente"], projeto_id=ids["projeto"]),
    )

    assert r.status_code == 400
    assert "não pertence" in r.get_json()["erro"]


def test_campo_desconhecido(ambiente):
    client, ids = ambiente

    r = client.post("/pagamentos/", json=corpo(ids, banana=1))

    assert r.status_code == 400
    assert "banana" in r.get_json()["erro"]


def test_forma_e_status_invalidos(ambiente):
    client, ids = ambiente

    assert client.post("/pagamentos/", json=corpo(ids, forma_pagamento="Cheque")).status_code == 400
    assert client.post("/pagamentos/", json=corpo(ids, status_pagamento="Talvez")).status_code == 400


def test_pendente_vencido_vira_atrasado(ambiente):
    client, ids = ambiente

    body = client.post("/pagamentos/", json=corpo(ids, data_vencimento=em_dias(-5))).get_json()

    assert body["status_pagamento"] == "Atrasado"
    assert body["dias_atraso"] >= 4


def test_status_pago_sem_data_usa_hoje(ambiente):
    client, ids = ambiente

    body = client.post("/pagamentos/", json=corpo(ids, status_pagamento="Pago")).get_json()

    assert body["status_pagamento"] == "Pago"
    assert body["data_pagamento"] is not None


def test_data_pagamento_sem_status_marca_como_pago(ambiente):
    client, ids = ambiente

    body = client.post(
        "/pagamentos/", json=corpo(ids, data_pagamento=em_dias(0))
    ).get_json()

    assert body["status_pagamento"] == "Pago"


# ------------------------------------------------------------
# Parcelamento
# ------------------------------------------------------------

def test_gerar_parcelas(ambiente):
    client, ids = ambiente

    r = client.post(
        "/pagamentos/",
        json={
            "cliente_id": ids["cliente"],
            "projeto_id": ids["projeto"],
            "valor_total": 1000,
            "total_parcelas": 3,
            "data_vencimento": "2026-01-31",
            "forma_pagamento": "Boleto",
        },
    )

    assert r.status_code == 201
    parcelas = r.get_json()["pagamentos"]

    assert [p["numero_parcela"] for p in parcelas] == [1, 2, 3]
    assert all(p["total_parcelas"] == 3 for p in parcelas)
    assert all(p["tipo_pagamento"] == "Parcela" for p in parcelas)
    # centavos que sobram vão para a primeira parcela; a soma fecha em 1000
    assert [p["valor"] for p in parcelas] == [333.34, 333.33, 333.33]
    assert sum(p["valor"] for p in parcelas) == pytest.approx(1000)
    # 31/01 -> 28/02 -> 31/03
    assert [p["data_vencimento"] for p in parcelas] == [
        "2026-01-31",
        "2026-02-28",
        "2026-03-31",
    ]

    assert len(client.get("/pagamentos/").get_json()) == 3


def test_parcelar_exige_valor_total(ambiente):
    client, ids = ambiente

    r = client.post("/pagamentos/", json=corpo(ids, total_parcelas=3))

    assert r.status_code == 400
    assert "valor_total" in r.get_json()["erro"]


def test_parcelar_nao_aceita_pago(ambiente):
    client, ids = ambiente

    r = client.post(
        "/pagamentos/",
        json={
            "cliente_id": ids["cliente"],
            "valor_total": 900,
            "total_parcelas": 3,
            "data_vencimento": em_dias(10),
            "status_pagamento": "Pago",
        },
    )

    assert r.status_code == 400


def test_parcela_avulsa(ambiente):
    client, ids = ambiente

    r = client.post("/pagamentos/", json=corpo(ids, numero_parcela=2, total_parcelas=5))

    assert r.status_code == 201
    assert r.get_json()["tipo_pagamento"] == "Parcela"


def test_numero_parcela_maior_que_total(ambiente):
    client, ids = ambiente

    r = client.post("/pagamentos/", json=corpo(ids, numero_parcela=6, total_parcelas=5))

    assert r.status_code == 400


# ------------------------------------------------------------
# PUT / GET / DELETE
# ------------------------------------------------------------

def test_pagar_e_reabrir(ambiente):
    client, ids = ambiente
    pid = client.post("/pagamentos/", json=corpo(ids)).get_json()["id"]

    pago = client.put(f"/pagamentos/{pid}", json={"status_pagamento": "Pago"}).get_json()
    assert pago["status_pagamento"] == "Pago"
    assert pago["data_pagamento"] is not None

    aberto = client.put(f"/pagamentos/{pid}", json={"status_pagamento": "Pendente"}).get_json()
    assert aberto["status_pagamento"] == "Pendente"
    assert aberto["data_pagamento"] is None


def test_put_parcial_preserva_o_resto(ambiente):
    client, ids = ambiente
    pid = client.post("/pagamentos/", json=corpo(ids, observacoes="original")).get_json()["id"]

    body = client.put(f"/pagamentos/{pid}", json={"valor": 750.5}).get_json()

    assert body["valor"] == 750.5
    assert body["observacoes"] == "original"
    assert body["forma_pagamento"] == "Pix"


def test_put_aceita_objeto_completo_devolvido_pela_api(ambiente):
    client, ids = ambiente
    criado = client.post("/pagamentos/", json=corpo(ids)).get_json()

    criado["observacoes"] = "editado"
    r = client.put(f"/pagamentos/{criado['id']}", json=criado)

    assert r.status_code == 200
    assert r.get_json()["observacoes"] == "editado"


def test_put_vencimento_futuro_tira_do_atrasado(ambiente):
    client, ids = ambiente
    pid = client.post("/pagamentos/", json=corpo(ids, data_vencimento=em_dias(-3))).get_json()["id"]

    body = client.put(f"/pagamentos/{pid}", json={"data_vencimento": em_dias(10)}).get_json()

    assert body["status_pagamento"] == "Pendente"


def test_put_inexistente(ambiente):
    client, _ = ambiente

    assert client.put("/pagamentos/9999", json={"valor": 10}).status_code == 404


def test_put_nao_aceita_valor_total(ambiente):
    client, ids = ambiente
    pid = client.post("/pagamentos/", json=corpo(ids)).get_json()["id"]

    assert client.put(f"/pagamentos/{pid}", json={"valor_total": 10}).status_code == 400


def test_obter_e_deletar(ambiente):
    client, ids = ambiente
    pid = client.post("/pagamentos/", json=corpo(ids)).get_json()["id"]

    assert client.get(f"/pagamentos/{pid}").status_code == 200
    assert client.delete(f"/pagamentos/{pid}").status_code == 200
    assert client.get(f"/pagamentos/{pid}").status_code == 404
    assert client.delete(f"/pagamentos/{pid}").status_code == 404


# ------------------------------------------------------------
# Filtros e resumo
# ------------------------------------------------------------

@pytest.fixture
def com_dados(ambiente):
    client, ids = ambiente

    # A: pendente, cliente 1, Pix, vence em 10 dias
    client.post("/pagamentos/", json=corpo(ids, data_vencimento=em_dias(10)))
    # B: atrasado, cliente 1, Boleto, venceu há 10 dias
    client.post(
        "/pagamentos/",
        json=corpo(ids, data_vencimento=em_dias(-10), forma_pagamento="Boleto"),
    )
    # C: pago, cliente 2, Pix, vence em 5 dias
    client.post(
        "/pagamentos/",
        json=corpo(
            ids,
            cliente_id=ids["outro_cliente"],
            data_vencimento=em_dias(5),
            status_pagamento="Pago",
        ),
    )

    return client, ids


def contar(client, query):
    r = client.get(f"/pagamentos/?{query}")
    assert r.status_code == 200
    return len(r.get_json())


def test_filtros(com_dados):
    client, ids = com_dados

    assert contar(client, "") == 3
    assert contar(client, "status=Atrasado") == 1
    assert contar(client, "status=pendente,pago") == 2
    assert contar(client, f"cliente_id={ids['cliente']}") == 2
    assert contar(client, "forma_pagamento=pix") == 2
    assert contar(client, f"vencimento_de={em_dias(0)}&vencimento_ate={em_dias(20)}") == 2
    assert contar(client, f"pagamento_de={em_dias(-1)}") == 1
    assert contar(client, "busca=oficina") == 1
    assert contar(client, "busca=inexistente") == 0


def test_filtro_invalido_retorna_400(com_dados):
    client, _ = com_dados

    assert client.get("/pagamentos/?status=xyz").status_code == 400
    assert client.get("/pagamentos/?vencimento_de=ontem").status_code == 400
    assert client.get("/pagamentos/?cliente_id=abc").status_code == 400


def test_ordenacao_por_vencimento_decrescente(com_dados):
    client, _ = com_dados

    datas = [p["data_vencimento"] for p in client.get("/pagamentos/").get_json()]

    assert datas == sorted(datas, reverse=True)


def test_resumo(com_dados):
    client, ids = com_dados

    r = client.get("/pagamentos/resumo")

    assert r.status_code == 200
    body = r.get_json()
    assert body["total_a_receber"] == 1000
    assert body["total_atrasado"] == 500
    assert body["total_recebido"] == 500
    assert body["recebido_no_mes"] == 500
    assert body["por_status"]["Pendente"]["quantidade"] == 1

    filtrado = client.get(f"/pagamentos/resumo?cliente_id={ids['outro_cliente']}").get_json()
    assert filtrado["total_a_receber"] == 0
    assert filtrado["total_recebido"] == 500