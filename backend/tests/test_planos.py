import os

# IMPORTANTE: precisa vir ANTES de importar backend.app,
# para os testes nunca usarem o banco de produção.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from datetime import date

import pytest

from backend.app import app as flask_app
from backend.database import db
from backend.models import Cliente, PlanoRecorrente
from backend.routes.planos import calcular_proximo_vencimento


# ============================================================
# FIXTURES
# ============================================================

@pytest.fixture()
def contexto():
    flask_app.config["TESTING"] = True

    tabelas = [Cliente.__table__, PlanoRecorrente.__table__]

    with flask_app.app_context():

        # Só as tabelas necessárias (Lead usa ARRAY, exclusivo do PostgreSQL)
        db.metadata.create_all(db.engine, tables=tabelas)

        cliente = Cliente(nome_empresa="Empresa Teste")
        db.session.add(cliente)
        db.session.commit()

        yield flask_app.test_client(), cliente.id

        db.session.remove()
        db.metadata.drop_all(db.engine, tables=tabelas)


def payload(cliente_id, **extra):
    dados = {
        "cliente_id": cliente_id,
        "nome_plano": "Plano Pro",
        "valor_mensal": 299.9,
        "dia_cobranca": 10,
    }
    dados.update(extra)
    return dados


def criar_plano(http, cliente_id, **extra):
    resp = http.post("/planos/", json=payload(cliente_id, **extra))
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


# ============================================================
# POST
# ============================================================

def test_criar_plano_valido_aplica_padroes(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    assert plano["cliente_id"] == cliente_id
    assert plano["cliente_nome"] == "Empresa Teste"
    assert plano["nome_plano"] == "Plano Pro"
    assert plano["valor_mensal"] == 299.9
    assert plano["dia_cobranca"] == 10
    assert plano["status_plano"] == "Ativo"
    assert plano["tipo_cobranca"] == "Mensal"
    assert plano["data_inicio"] == date.today().isoformat()
    assert plano["proximo_vencimento"] is not None
    assert plano["data_cancelamento"] is None


def test_criar_aceita_valor_e_status_em_formato_antigo(contexto):
    http, cliente_id = contexto

    plano = criar_plano(
        http,
        cliente_id,
        valor_mensal="199,90",
        status_plano="pausado",
    )

    assert plano["valor_mensal"] == 199.9
    assert plano["status_plano"] == "Pausado"


def test_criar_sem_dados_retorna_400(contexto):
    http, _ = contexto

    assert http.post("/planos/", json={}).status_code == 400


def test_criar_sem_cliente_retorna_400(contexto):
    http, cliente_id = contexto

    dados = payload(cliente_id)
    del dados["cliente_id"]

    assert http.post("/planos/", json=dados).status_code == 400


def test_criar_com_cliente_inexistente_retorna_400(contexto):
    http, _ = contexto

    resp = http.post("/planos/", json=payload(999999))

    assert resp.status_code == 400
    assert "Cliente" in resp.get_json()["erro"]


@pytest.mark.parametrize("extra", [
    {"nome_plano": "Plano Inexistente"},
    {"valor_mensal": -10},
    {"valor_mensal": "abc"},
    {"dia_cobranca": 0},
    {"dia_cobranca": 32},
    {"status_plano": "Qualquer"},
    {"tipo_cobranca": "Quinzenal"},
    {"forma_pagamento": "Fiado"},
    {"data_inicio": "10/03/2026"},
])
def test_criar_com_dados_invalidos_retorna_400(contexto, extra):
    http, cliente_id = contexto

    resp = http.post("/planos/", json=payload(cliente_id, **extra))

    assert resp.status_code == 400
    assert "erro" in resp.get_json()


def test_criar_cancelado_sem_motivo_retorna_400(contexto):
    http, cliente_id = contexto

    resp = http.post(
        "/planos/",
        json=payload(cliente_id, status_plano="Cancelado"),
    )

    assert resp.status_code == 400


# ============================================================
# GET
# ============================================================

def test_listar_e_filtrar(contexto):
    http, cliente_id = contexto

    criar_plano(http, cliente_id)
    criar_plano(
        http,
        cliente_id,
        status_plano="Cancelado",
        motivo_cancelamento="Cliente encerrou a empresa",
    )

    todos = http.get("/planos/").get_json()
    assert len(todos) == 2

    cancelados = http.get("/planos/?status_plano=Cancelado").get_json()
    assert len(cancelados) == 1
    assert cancelados[0]["status_plano"] == "Cancelado"

    do_cliente = http.get(f"/planos/?cliente_id={cliente_id}").get_json()
    assert len(do_cliente) == 2

    outro_cliente = http.get("/planos/?cliente_id=999999").get_json()
    assert outro_cliente == []


def test_obter_por_id(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    resp = http.get(f"/planos/{plano['id']}")

    assert resp.status_code == 200
    assert resp.get_json()["id"] == plano["id"]


def test_obter_inexistente_retorna_404(contexto):
    http, _ = contexto

    assert http.get("/planos/999999").status_code == 404


# ============================================================
# PUT
# ============================================================

def test_atualizar_campos(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    resp = http.put(
        f"/planos/{plano['id']}",
        json={
            "valor_mensal": 399.9,
            "forma_pagamento": "PIX",
            "tipo_cobranca": "Trimestral",
        },
    )

    corpo = resp.get_json()

    assert resp.status_code == 200
    assert corpo["valor_mensal"] == 399.9
    assert corpo["forma_pagamento"] == "PIX"
    assert corpo["tipo_cobranca"] == "Trimestral"
    assert corpo["nome_plano"] == "Plano Pro"


def test_atualizar_ignora_campos_desconhecidos(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    resp = http.put(
        f"/planos/{plano['id']}",
        json={
            "id": 999,
            "cliente_nome": "Outro nome",
            "created_at": "2000-01-01",
            "valor_mensal": 350,
        },
    )

    corpo = resp.get_json()

    assert resp.status_code == 200
    assert corpo["id"] == plano["id"]
    assert corpo["cliente_nome"] == "Empresa Teste"
    assert corpo["valor_mensal"] == 350


def test_atualizar_com_valor_invalido_retorna_400(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    resp = http.put(
        f"/planos/{plano['id']}",
        json={"valor_mensal": -5},
    )

    assert resp.status_code == 400


def test_atualizar_inexistente_retorna_404(contexto):
    http, _ = contexto

    resp = http.put("/planos/999999", json={"valor_mensal": 100})

    assert resp.status_code == 404


def test_cancelar_exige_motivo(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    resp = http.put(
        f"/planos/{plano['id']}",
        json={"status_plano": "Cancelado"},
    )

    assert resp.status_code == 400


def test_cancelar_preenche_data_e_limpa_vencimento(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    resp = http.put(
        f"/planos/{plano['id']}",
        json={
            "status_plano": "Cancelado",
            "motivo_cancelamento": "Preço",
        },
    )

    corpo = resp.get_json()

    assert resp.status_code == 200
    assert corpo["status_plano"] == "Cancelado"
    assert corpo["motivo_cancelamento"] == "Preço"
    assert corpo["data_cancelamento"] == date.today().isoformat()
    assert corpo["proximo_vencimento"] is None


def test_cancelamento_antes_do_inicio_retorna_400(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id, data_inicio="2026-06-01")

    resp = http.put(
        f"/planos/{plano['id']}",
        json={
            "status_plano": "Cancelado",
            "motivo_cancelamento": "Preço",
            "data_cancelamento": "2026-05-01",
        },
    )

    assert resp.status_code == 400


def test_reativar_limpa_cancelamento_e_recalcula_vencimento(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    http.put(
        f"/planos/{plano['id']}",
        json={
            "status_plano": "Cancelado",
            "motivo_cancelamento": "Preço",
        },
    )

    resp = http.put(
        f"/planos/{plano['id']}",
        json={"status_plano": "Ativo"},
    )

    corpo = resp.get_json()

    assert resp.status_code == 200
    assert corpo["status_plano"] == "Ativo"
    assert corpo["data_cancelamento"] is None
    assert corpo["motivo_cancelamento"] is None
    assert corpo["proximo_vencimento"] is not None


# ============================================================
# DELETE
# ============================================================

def test_deletar(contexto):
    http, cliente_id = contexto

    plano = criar_plano(http, cliente_id)

    assert http.delete(f"/planos/{plano['id']}").status_code == 200
    assert http.get(f"/planos/{plano['id']}").status_code == 404


def test_deletar_inexistente_retorna_404(contexto):
    http, _ = contexto

    assert http.delete("/planos/999999").status_code == 404


# ============================================================
# CÁLCULO DO PRÓXIMO VENCIMENTO
# ============================================================

def test_vencimento_no_mesmo_mes():
    assert calcular_proximo_vencimento(20, date(2026, 3, 10)) == date(2026, 3, 20)


def test_vencimento_no_proprio_dia():
    assert calcular_proximo_vencimento(10, date(2026, 3, 10)) == date(2026, 3, 10)


def test_vencimento_no_mes_seguinte():
    assert calcular_proximo_vencimento(5, date(2026, 3, 10)) == date(2026, 4, 5)


def test_vencimento_virada_de_ano():
    assert calcular_proximo_vencimento(5, date(2026, 12, 10)) == date(2027, 1, 5)


def test_vencimento_dia_31_em_fevereiro():
    assert calcular_proximo_vencimento(31, date(2026, 2, 10)) == date(2026, 2, 28)