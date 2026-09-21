from datetime import date

import pytest

from backend.database import db
from backend.models import Cliente, Interacao, Lead


# ============================================================
# HELPERS
# ============================================================

def criar_lead(**campos):
    lead = Lead(nome_empresa="Empresa Lead", **campos)
    db.session.add(lead)
    db.session.commit()
    return lead


def criar_cliente(**campos):
    cliente = Cliente(nome_empresa="Empresa Cliente", **campos)
    db.session.add(cliente)
    db.session.commit()
    return cliente


def corpo(**extra):
    base = {
        "tipo_interacao": "WhatsApp",
        "data_interacao": "2026-09-21T10:30",
    }
    base.update(extra)
    return base


def registrar(client, **extra):
    resposta = client.post("/interacoes/", json=corpo(**extra))
    assert resposta.status_code == 201, resposta.get_json()
    return resposta.get_json()


# ============================================================
# POST - CRIAR
# ============================================================

def test_criar_para_lead_retorna_todos_os_campos(client):
    lead = criar_lead()

    resposta = client.post("/interacoes/", json=corpo(
        lead_id=lead.id,
        responsavel="Gabriel",
        resultado="Respondeu",
        proxima_acao="Enviar orçamento",
        data_proxima_acao="2026-09-25",
        descricao="Conversa inicial sobre o site.",
    ))

    assert resposta.status_code == 201

    dados = resposta.get_json()

    assert dados["lead_id"] == lead.id
    assert dados["cliente_id"] is None
    assert dados["lead_nome"] == "Empresa Lead"
    assert dados["responsavel"] == "Gabriel"
    assert dados["tipo_interacao"] == "WhatsApp"
    assert dados["data_interacao"] == "2026-09-21T10:30:00"
    assert dados["resultado"] == "Respondeu"
    assert dados["proxima_acao"] == "Enviar orçamento"
    assert dados["data_proxima_acao"] == "2026-09-25"
    assert dados["descricao"] == "Conversa inicial sobre o site."
    assert dados["created_at"] is not None


def test_criar_para_lead_atualiza_datas_do_lead(client):
    lead = criar_lead()

    registrar(
        client,
        lead_id=lead.id,
        proxima_acao="Enviar orçamento",
        data_proxima_acao="2026-09-25",
    )

    db.session.refresh(lead)

    assert lead.abordado == "Sim"
    assert lead.data_primeiro_contato == date(2026, 9, 21)
    assert lead.data_ultimo_contato == date(2026, 9, 21)
    assert lead.proxima_acao == "Enviar orçamento"
    assert lead.data_proxima_acao == date(2026, 9, 25)


def test_interacao_antiga_nao_faz_o_ultimo_contato_recuar(client):
    lead = criar_lead(
        data_ultimo_contato=date(2026, 9, 30),
        proxima_acao="Fazer follow-up",
        data_proxima_acao=date(2026, 10, 5),
    )

    registrar(
        client,
        lead_id=lead.id,
        proxima_acao="Enviar orçamento",
        data_proxima_acao="2026-09-25",
    )

    db.session.refresh(lead)

    assert lead.data_ultimo_contato == date(2026, 9, 30)
    assert lead.data_primeiro_contato == date(2026, 9, 21)
    assert lead.proxima_acao == "Fazer follow-up"
    assert lead.data_proxima_acao == date(2026, 10, 5)


def test_proxima_acao_nenhuma_limpa_a_data_do_lead(client):
    lead = criar_lead(
        proxima_acao="Fazer follow-up",
        data_proxima_acao=date(2026, 10, 5),
    )

    registrar(client, lead_id=lead.id, proxima_acao="Nenhuma")

    db.session.refresh(lead)

    assert lead.proxima_acao == "Nenhuma"
    assert lead.data_proxima_acao is None


def test_criar_para_cliente_atualiza_contatos_do_cliente(client):
    cliente = criar_cliente()

    dados = registrar(
        client,
        cliente_id=cliente.id,
        tipo_interacao="Ligação",
        proxima_acao="Fazer pós-venda",
        data_proxima_acao="2026-10-01",
    )

    assert dados["cliente_id"] == cliente.id
    assert dados["lead_id"] is None
    assert dados["cliente_nome"] == "Empresa Cliente"

    db.session.refresh(cliente)

    assert cliente.ultimo_contato == date(2026, 9, 21)
    assert cliente.proximo_contato == date(2026, 10, 1)


def test_aceita_resumo_como_apelido_de_descricao_e_email_antigo(client):
    lead = criar_lead()

    dados = registrar(
        client,
        lead_id=lead.id,
        tipo_interacao="email",
        resumo="Texto no formato antigo",
    )

    assert dados["tipo_interacao"] == "E-mail"
    assert dados["descricao"] == "Texto no formato antigo"


def test_aceita_data_sem_horario_e_texto_em_minusculas(client):
    lead = criar_lead()

    dados = registrar(
        client,
        lead_id=lead.id,
        tipo_interacao="whatsapp",
        data_interacao="2026-09-21",
    )

    assert dados["tipo_interacao"] == "WhatsApp"
    assert dados["data_interacao"] == "2026-09-21T00:00:00"


def test_strings_vazias_viram_nulo(client):
    lead = criar_lead()

    dados = registrar(
        client,
        lead_id=lead.id,
        responsavel="  ",
        resultado="",
        proxima_acao="",
        data_proxima_acao="",
        descricao="",
    )

    assert dados["responsavel"] is None
    assert dados["resultado"] is None
    assert dados["proxima_acao"] is None
    assert dados["data_proxima_acao"] is None
    assert dados["descricao"] is None


def test_corpo_vazio_retorna_400(client):
    assert client.post("/interacoes/", json={}).status_code == 400
    assert client.post("/interacoes/", data="não é json").status_code == 400


@pytest.mark.parametrize(
    "extra, trecho",
    [
        ({"tipo_interacao": "Pombo-correio"}, "tipo_interacao"),
        ({"tipo_interacao": ""}, "obrigatório"),
        ({"resultado": "Talvez"}, "resultado"),
        ({"proxima_acao": "Dançar"}, "proxima_acao"),
        ({"data_interacao": "ontem"}, "data_interacao"),
        ({"data_interacao": None}, "obrigatório"),
        ({"data_proxima_acao": "31/12/2026"}, "data_proxima_acao"),
        (
            {"data_proxima_acao": "2026-09-01"},
            "anterior",
        ),
        ({"responsavel": "x" * 300}, "responsavel"),
        ({"descricao": 123}, "descricao"),
        ({"tipo_origem": "lead", "origem_id": 1}, "Campos não permitidos"),
    ],
)
def test_criar_rejeita_dados_invalidos(client, extra, trecho):
    lead = criar_lead()

    resposta = client.post(
        "/interacoes/", json=corpo(lead_id=lead.id, **extra)
    )

    assert resposta.status_code == 400
    assert trecho in resposta.get_json()["erro"]


def test_criar_sem_tipo_ou_sem_data_retorna_400(client):
    lead = criar_lead()

    sem_tipo = client.post("/interacoes/", json={
        "lead_id": lead.id,
        "data_interacao": "2026-09-21T10:30",
    })
    sem_data = client.post("/interacoes/", json={
        "lead_id": lead.id,
        "tipo_interacao": "WhatsApp",
    })

    assert sem_tipo.status_code == 400
    assert "tipo_interacao" in sem_tipo.get_json()["erro"]
    assert sem_data.status_code == 400
    assert "data_interacao" in sem_data.get_json()["erro"]


def test_criar_exige_exatamente_um_vinculo(client):
    lead = criar_lead()
    cliente = criar_cliente()

    sem_vinculo = client.post("/interacoes/", json=corpo())
    dois_vinculos = client.post("/interacoes/", json=corpo(
        lead_id=lead.id, cliente_id=cliente.id
    ))

    assert sem_vinculo.status_code == 400
    assert "exatamente um" in sem_vinculo.get_json()["erro"]
    assert dois_vinculos.status_code == 400
    assert "exatamente um" in dois_vinculos.get_json()["erro"]


def test_criar_com_lead_ou_cliente_inexistente_retorna_400(client):
    lead = client.post("/interacoes/", json=corpo(lead_id=999))
    cliente = client.post("/interacoes/", json=corpo(cliente_id=999))

    assert lead.status_code == 400
    assert "não encontrado" in lead.get_json()["erro"]
    assert cliente.status_code == 400
    assert "não encontrado" in cliente.get_json()["erro"]


def test_criar_com_id_nao_numerico_retorna_400(client):
    resposta = client.post("/interacoes/", json=corpo(lead_id="abc"))

    assert resposta.status_code == 400
    assert "lead_id" in resposta.get_json()["erro"]


def test_interacao_invalida_nao_altera_o_lead(client):
    lead = criar_lead()

    client.post("/interacoes/", json=corpo(
        lead_id=lead.id, tipo_interacao="Pombo-correio"
    ))

    db.session.refresh(lead)

    assert lead.data_ultimo_contato is None
    assert lead.abordado in (None, "Não")


# ============================================================
# GET - LISTAR / OBTER
# ============================================================

def test_listar_ordena_da_mais_recente_para_a_mais_antiga(client):
    lead = criar_lead()
    cliente = criar_cliente()

    a = registrar(client, lead_id=lead.id, data_interacao="2026-09-20T09:00")
    b = registrar(client, lead_id=lead.id, data_interacao="2026-09-22T09:00")
    c = registrar(client, cliente_id=cliente.id, data_interacao="2026-09-21T09:00")

    resposta = client.get("/interacoes/")

    assert resposta.status_code == 200
    assert [i["id"] for i in resposta.get_json()] == [b["id"], c["id"], a["id"]]


def test_listar_filtra_por_lead_cliente_tipo_resultado_e_periodo(client):
    lead = criar_lead()
    cliente = criar_cliente()

    a = registrar(
        client, lead_id=lead.id, tipo_interacao="Ligação",
        resultado="Interessado", responsavel="Ana",
        data_interacao="2026-09-20T09:00",
    )
    b = registrar(
        client, lead_id=lead.id, tipo_interacao="WhatsApp",
        resultado="Sem resposta", responsavel="Gabriel",
        data_interacao="2026-09-22T18:00",
    )
    c = registrar(
        client, cliente_id=cliente.id, tipo_interacao="WhatsApp",
        data_interacao="2026-09-21T09:00",
    )

    def ids(query):
        resposta = client.get(f"/interacoes/?{query}")
        assert resposta.status_code == 200
        return {i["id"] for i in resposta.get_json()}

    assert ids(f"lead_id={lead.id}") == {a["id"], b["id"]}
    assert ids(f"cliente_id={cliente.id}") == {c["id"]}
    assert ids("tipo_interacao=WhatsApp") == {b["id"], c["id"]}
    assert ids("resultado=Interessado") == {a["id"]}
    assert ids("responsavel=Gabriel") == {b["id"]}
    assert ids("de=2026-09-21") == {b["id"], c["id"]}
    # "ate" inclui o dia inteiro (22/09 às 18:00 entra)
    assert ids("ate=2026-09-22") == {a["id"], b["id"], c["id"]}
    assert ids("de=2026-09-21&ate=2026-09-21") == {c["id"]}


def test_listar_com_data_invalida_retorna_400(client):
    resposta = client.get("/interacoes/?de=amanha")

    assert resposta.status_code == 400
    assert "de" in resposta.get_json()["erro"]


def test_listar_vazio(client):
    resposta = client.get("/interacoes/")

    assert resposta.status_code == 200
    assert resposta.get_json() == []


def test_obter_por_id(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id)

    resposta = client.get(f"/interacoes/{criada['id']}")

    assert resposta.status_code == 200
    assert resposta.get_json()["id"] == criada["id"]
    assert resposta.get_json()["lead_nome"] == "Empresa Lead"


def test_obter_inexistente_retorna_404_em_json(client):
    resposta = client.get("/interacoes/999")

    assert resposta.status_code == 404
    assert "erro" in resposta.get_json()


# ============================================================
# PUT - ATUALIZAR
# ============================================================

def test_atualizar_parcialmente(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id, descricao="Original")

    resposta = client.put(
        f"/interacoes/{criada['id']}",
        json={"resultado": "Fechado", "responsavel": "Ana"},
    )

    assert resposta.status_code == 200

    dados = resposta.get_json()

    assert dados["resultado"] == "Fechado"
    assert dados["responsavel"] == "Ana"
    assert dados["descricao"] == "Original"
    assert dados["tipo_interacao"] == "WhatsApp"


def test_atualizar_pode_apagar_campos_opcionais(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id, resultado="Respondeu")

    resposta = client.put(
        f"/interacoes/{criada['id']}", json={"resultado": ""}
    )

    assert resposta.status_code == 200
    assert resposta.get_json()["resultado"] is None


def test_atualizar_nao_permite_apagar_campos_obrigatorios(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id)

    for campo in ("tipo_interacao", "data_interacao"):
        resposta = client.put(f"/interacoes/{criada['id']}", json={campo: ""})

        assert resposta.status_code == 400
        assert campo in resposta.get_json()["erro"]


def test_atualizar_ignora_campos_somente_leitura(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id)

    # O frontend pode devolver o objeto inteiro.
    resposta = client.put(f"/interacoes/{criada['id']}", json={
        "id": 999,
        "lead_nome": "Outro nome",
        "created_at": "2000-01-01T00:00:00",
        "resultado": "Respondeu",
    })

    assert resposta.status_code == 200
    assert resposta.get_json()["id"] == criada["id"]
    assert resposta.get_json()["lead_nome"] == "Empresa Lead"


def test_atualizar_trocando_lead_por_cliente(client):
    lead = criar_lead()
    cliente = criar_cliente()
    criada = registrar(client, lead_id=lead.id)

    resposta = client.put(
        f"/interacoes/{criada['id']}",
        json={"lead_id": None, "cliente_id": cliente.id},
    )

    assert resposta.status_code == 200
    assert resposta.get_json()["lead_id"] is None
    assert resposta.get_json()["cliente_id"] == cliente.id


def test_atualizar_nao_deixa_ficar_com_dois_vinculos(client):
    lead = criar_lead()
    cliente = criar_cliente()
    criada = registrar(client, lead_id=lead.id)

    resposta = client.put(
        f"/interacoes/{criada['id']}", json={"cliente_id": cliente.id}
    )

    assert resposta.status_code == 400
    assert "exatamente um" in resposta.get_json()["erro"]


def test_atualizar_nao_deixa_ficar_sem_vinculo(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id)

    resposta = client.put(f"/interacoes/{criada['id']}", json={"lead_id": None})

    assert resposta.status_code == 400


def test_atualizar_valida_data_proxima_acao_com_a_data_ja_salva(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id)  # 2026-09-21

    resposta = client.put(
        f"/interacoes/{criada['id']}",
        json={"data_proxima_acao": "2026-09-01"},
    )

    assert resposta.status_code == 400
    assert "anterior" in resposta.get_json()["erro"]


def test_atualizar_inexistente_e_corpo_vazio(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id)

    assert client.put("/interacoes/999", json={"resultado": "Fechado"}).status_code == 404
    assert client.put(f"/interacoes/{criada['id']}", json={}).status_code == 400


# ============================================================
# DELETE
# ============================================================

def test_deletar(client):
    lead = criar_lead()
    criada = registrar(client, lead_id=lead.id)

    assert client.delete(f"/interacoes/{criada['id']}").status_code == 200
    assert client.get(f"/interacoes/{criada['id']}").status_code == 404
    assert client.delete(f"/interacoes/{criada['id']}").status_code == 404


def test_excluir_lead_exclui_o_historico_de_interacoes(client):
    lead = criar_lead()
    registrar(client, lead_id=lead.id)
    registrar(client, lead_id=lead.id)

    db.session.delete(lead)
    db.session.commit()

    assert Interacao.query.count() == 0


def test_excluir_cliente_exclui_o_historico_de_interacoes(client):
    cliente = criar_cliente()
    outro = criar_cliente()
    registrar(client, cliente_id=cliente.id)
    mantida = registrar(client, cliente_id=outro.id)

    db.session.delete(cliente)
    db.session.commit()

    restantes = Interacao.query.all()

    assert [i.id for i in restantes] == [mantida["id"]]