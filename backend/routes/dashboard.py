from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_

from backend.database import db
from backend.models import (
    Lead,
    Cliente,
    Projeto,
    Pagamento,
    PlanoRecorrente,
    Interacao,
)

dashboard_bp = Blueprint("dashboard", __name__)


# ============================================================
# AUXILIARES
# ============================================================

# def converter_valor(valor):
    # """
    # Converte valores como:
    #     1500
    #     "1500"
    #     "1500.50"
    #     "R$ 1.500,50"
    #     "1.500,50"

    # para float.
    # """

    # if valor is None:
    #     return 0.0

    # try:
    #     if isinstance(valor, (int, float)):
    #         return float(valor)

    #     texto = str(valor).strip()

    #     if not texto:
    #         return 0.0

    #     texto = (
    #         texto
    #         .replace("R$", "")
    #         .replace("r$", "")
    #         .replace(" ", "")
    #     )

    #     if "," in texto:
    #         texto = texto.replace(".", "")
    #         texto = texto.replace(",", ".")

    #     return float(texto)

    # except (ValueError, TypeError):
    #     return 0.0
def converter_valor(valor):
    """
    Converte as faixas de potencial de lead em valores
    aproximados para cálculo de ticket médio e valor potencial.
    """

    if valor is None:
        return 0.0

    if isinstance(valor, (int, float)):
        return float(valor)

    texto = str(valor).strip().replace(" ", "")

    faixas_potencial = {
        "AtéR$500": 250.0,
        "R$500–1.000": 750.0,
        "R$1.000–1.500": 1250.0,
        "R$1.500–2.000": 1750.0,
        "R$2.000–2.500": 2250.0,
        "R$2.500–3.000": 2750.0,
        "R$3.000–3.500": 3250.0,
        "R$3.500–4.000": 3750.0,
        "R$4.000–4.500": 4250.0,
        "R$4.500–5.000": 4750.0,
        "R$5.000–5.500": 5250.0,
        "R$5.500–6.000": 5750.0,
        "R$6.000–6.500": 6250.0,
        "R$6.500–7.000": 6750.0,
        "R$7.000–7.500": 7250.0,
        "R$7.500–8.000": 7750.0,
        "R$8.000–8.500": 8250.0,
        "R$8.500–9.000": 8750.0,
        "R$9.000–9.500": 9250.0,
        "R$9.500–10.000": 9750.0,
        "R$10.000–11.000": 10500.0,
        "R$11.000–12.000": 11500.0,
        "R$12.000–13.000": 12500.0,
        "R$13.000–14.000": 13500.0,
        "R$14.000–15.000": 14500.0,
        "R$15.000–17.500": 16250.0,
        "R$17.500–20.000": 18750.0,
        "R$20.000–25.000": 22500.0,
        "R$25.000–30.000": 27500.0,
        "R$30.000–40.000": 35000.0,
        "R$40.000–50.000": 45000.0,
        # Não existe limite superior para essa faixa.
        # R$50.000 é usado apenas como referência mínima.
        "AcimadeR$50.000": 50000.0,
        "Nãoinformado": 0.0,
    }

    if texto in faixas_potencial:
        return faixas_potencial[texto]

    # Permite também valores numéricos diretos
    try:
        texto_numerico = (
            texto
            .replace("R$", "")
            .replace("r$", "")
        )

        if "," in texto_numerico:
            texto_numerico = texto_numerico.replace(".", "")
            texto_numerico = texto_numerico.replace(",", ".")

        return float(texto_numerico)

    except (ValueError, TypeError):
        return 0.0

def percentual(parte, total):
    if not total:
        return 0.0

    return round((parte / total) * 100, 2)


def normalizar_texto(valor):
    """
    Normaliza textos para comparação dos filtros.
    """

    if valor is None:
        return ""

    return str(valor).strip().lower()


def aplicar_filtro_texto(query, campo, valor):
    """
    Aplica filtro case-insensitive quando o valor existe.
    """

    if valor:
        return query.filter(
            func.lower(campo) == normalizar_texto(valor)
        )

    return query


# ============================================================
# DASHBOARD
# ============================================================

@dashboard_bp.get("/")
def dashboard():

    # ========================================================
    # FILTROS RECEBIDOS
    # ========================================================

    periodo = request.args.get("periodo", "todos")
    busca = request.args.get("busca", "").strip()

    responsavel = request.args.get("responsavel", "").strip()
    origem = request.args.get("origem", "").strip()
    ramo = request.args.get("ramo", "").strip()
    status = request.args.get("status", "").strip()
    etapa = request.args.get("etapa", "").strip()

    data_inicio = request.args.get("data_inicio", "").strip()
    data_fim = request.args.get("data_fim", "").strip()

    # ========================================================
    # QUERY BASE DE LEADS
    # ========================================================

    query_leads = db.session.query(Lead)

    # --------------------------------------------------------
    # PESQUISA
    # --------------------------------------------------------

    if busca:
        termo = f"%{busca.lower()}%"

        query_leads = query_leads.filter(
            or_(
                func.lower(Lead.nome_empresa).like(termo),
                func.lower(Lead.nome_contato).like(termo),
                func.lower(Lead.telefone).like(termo),
                func.lower(Lead.email).like(termo),
            )
        )

    # --------------------------------------------------------
    # RESPONSÁVEL
    # --------------------------------------------------------

    if responsavel:
        query_leads = query_leads.filter(
            func.lower(Lead.responsavel)
            == normalizar_texto(responsavel)
        )

    # --------------------------------------------------------
    # ORIGEM
    # --------------------------------------------------------

    if origem:
        if normalizar_texto(origem) == "não informado":
            query_leads = query_leads.filter(
                or_(
                    Lead.origem_lead.is_(None),
                    func.trim(Lead.origem_lead) == ""
                )
            )
        else:
            query_leads = query_leads.filter(
                func.lower(Lead.origem_lead)
                == normalizar_texto(origem)
            )
    # --------------------------------------------------------
    # RAMO
    # --------------------------------------------------------

    if ramo:
        query_leads = query_leads.filter(
            func.lower(Lead.ramo)
            == normalizar_texto(ramo)
        )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    if status:
        query_leads = query_leads.filter(
            func.lower(Lead.status_lead)
            == normalizar_texto(status)
        )

    # --------------------------------------------------------
    # ETAPA
    # --------------------------------------------------------

    if etapa:
        query_leads = query_leads.filter(
            func.lower(Lead.etapa_comercial)
            == normalizar_texto(etapa)
        )

    # ========================================================
    # FILTRO DE DATA
    # ========================================================

    if data_inicio:
        query_leads = query_leads.filter(
            func.date(Lead.created_at) >= data_inicio
        )

    if data_fim:
        query_leads = query_leads.filter(
            func.date(Lead.created_at) <= data_fim
        )

    # ========================================================
    # PERÍODOS AUTOMÁTICOS
    # ========================================================

    if periodo != "todos" and not data_inicio and not data_fim:

        if periodo == "hoje":
            query_leads = query_leads.filter(
                func.date(Lead.created_at)
                == func.current_date()
            )

        elif periodo == "7":
            query_leads = query_leads.filter(
                Lead.created_at >= func.now() - func.cast(
                    "7 days",
                    db.String
                )
            )

        elif periodo == "30":
            query_leads = query_leads.filter(
                Lead.created_at >= func.now() - func.cast(
                    "30 days",
                    db.String
                )
            )

        elif periodo == "90":
            query_leads = query_leads.filter(
                Lead.created_at >= func.now() - func.cast(
                    "90 days",
                    db.String
                )
            )

        elif periodo == "ano":
            query_leads = query_leads.filter(
                func.extract("year", Lead.created_at)
                == func.extract(
                    "year",
                    func.current_date()
                )
            )

    leads = query_leads.all()

    # ========================================================
    # DADOS DOS LEADS
    # ========================================================

    total_leads = len(leads)

    leads_novos = sum(
        1
        for lead in leads
        if normalizar_texto(lead.status_lead) == "novo"
    )

    leads_andamento = sum(
        1
        for lead in leads
        if normalizar_texto(lead.status_lead)
        == "em andamento"
    )

    leads_convertidos = sum(
        1
        for lead in leads
        if normalizar_texto(lead.status_lead)
        == "convertido"
    )

    leads_perdidos = sum(
        1
        for lead in leads
        if normalizar_texto(lead.status_lead)
        == "perdido"
    )

    # ========================================================
    # VALOR POTENCIAL
    # ========================================================



    # valor_potencial = sum(
    #     converter_valor(lead.potencial_valor)
    #     for lead in leads
    # )

    # leads_com_valor = [
    #     lead
    #     for lead in leads
    #     if converter_valor(lead.potencial_valor) > 0
    # ]

    # ticket_potencial_medio = (
    #     valor_potencial / len(leads_com_valor)
    #     if leads_com_valor
    #     else 0
    # )
    






    # ========================================================
# VALOR POTENCIAL - DEBUG
# ========================================================

    print("\n========== DEBUG POTENCIAL ==========")

    for lead in leads:
        print(
            f"ID={lead.id} | "
            f"EMPRESA={lead.nome_empresa} | "
            f"POTENCIAL={repr(lead.potencial_valor)} | "
            f"TIPO={type(lead.potencial_valor)} | "
            f"CONVERTIDO={converter_valor(lead.potencial_valor)}"
        )

    print("=====================================\n")

    valor_potencial = sum(
        converter_valor(lead.potencial_valor)
        for lead in leads
    )

    leads_com_valor = [
        lead
        for lead in leads
        if converter_valor(lead.potencial_valor) > 0
    ]

    ticket_potencial_medio = (
        valor_potencial / len(leads_com_valor)
        if leads_com_valor
        else 0
    )

    # ========================================================
    # FUNIL
    # ========================================================

    etapas = [
        "Novo Lead",
        "Primeiro Contato",
        "Respondeu",
        "Qualificado",
        "Reunião/Briefing",
        "Orçamento Enviado",
        "Negociação",
        "Fechado",
    ]

    funil = []

    for etapa_nome in etapas:

        quantidade = sum(
            1
            for lead in leads
            if normalizar_texto(lead.etapa_comercial)
            == normalizar_texto(etapa_nome)
        )

        chave = (
            etapa_nome
            .lower()
            .replace("/", "_")
            .replace(" ", "_")
        )

        funil.append({
            "chave": chave,
            "etapa": etapa_nome,
            "quantidade": quantidade,
        })

    # ========================================================
    # LEADS POR ORIGEM
    # ========================================================

    origens = {}

    for lead in leads:

        nome_origem = (
            lead.origem_lead
            or "Não informado"
        )

        origens[nome_origem] = (
            origens.get(nome_origem, 0) + 1
        )

    leads_por_origem = [
        {
            "origem": origem_nome,
            "quantidade": quantidade,
        }
        for origem_nome, quantidade
        in sorted(
            origens.items(),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    # ========================================================
    # LEADS POR RESPONSÁVEL
    # ========================================================

    responsaveis = {}

    for lead in leads:

        nome_responsavel = (
            lead.responsavel
            or "Não informado"
        )

        responsaveis[nome_responsavel] = (
            responsaveis.get(nome_responsavel, 0) + 1
        )

    leads_por_responsavel = [
        {
            "responsavel": responsavel_nome,
            "quantidade": quantidade,
        }
        for responsavel_nome, quantidade
        in sorted(
            responsaveis.items(),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    # ========================================================
    # LEADS POR RAMO
    # ========================================================

    ramos = {}

    for lead in leads:

        nome_ramo = (
            lead.ramo
            or lead.ramo_personalizado
            or "Não informado"
        )

        ramos[nome_ramo] = (
            ramos.get(nome_ramo, 0) + 1
        )

    leads_por_ramo = [
        {
            "ramo": ramo_nome,
            "quantidade": quantidade,
        }
        for ramo_nome, quantidade
        in sorted(
            ramos.items(),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    # ========================================================
    # MOTIVOS DE PERDA
    # ========================================================

    motivos_perda = {}

    for lead in leads:

        if normalizar_texto(lead.status_lead) != "perdido":
            continue

        motivo = (
            lead.motivo_perda_personalizado
            or lead.motivo_perda
            or "Não informado"
        )

        motivos_perda[motivo] = (
            motivos_perda.get(motivo, 0) + 1
        )

    motivos_de_perda = [
        {
            "motivo": motivo,
            "quantidade": quantidade,
        }
        for motivo, quantidade
        in sorted(
            motivos_perda.items(),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    # ========================================================
    # EVOLUÇÃO DOS LEADS
    # ========================================================

    evolucao = {}

    for lead in leads:

        if not lead.created_at:
            continue

        periodo_data = lead.created_at.strftime(
            "%Y-%m-%d"
        )

        if periodo_data not in evolucao:
            evolucao[periodo_data] = {
                "data": periodo_data,
                "leads": 0,
                "convertidos": 0,
                "perdidos": 0,
            }

        evolucao[periodo_data]["leads"] += 1

        if normalizar_texto(lead.status_lead) == "convertido":
            evolucao[periodo_data]["convertidos"] += 1

        if normalizar_texto(lead.status_lead) == "perdido":
            evolucao[periodo_data]["perdidos"] += 1

    evolucao_leads = [
        evolucao[data]
        for data in sorted(evolucao.keys())
    ]

    # ========================================================
    # CLIENTES
    # ========================================================

    query_clientes = db.session.query(Cliente)

    if busca:
        termo = f"%{busca.lower()}%"

        query_clientes = query_clientes.filter(
            or_(
                func.lower(Cliente.nome_empresa).like(termo),
                func.lower(Cliente.nome_contato).like(termo),
                func.lower(Cliente.telefone).like(termo),
                func.lower(Cliente.email).like(termo),
            )
        )

    clientes = query_clientes.all()

    clientes_ativos = sum(
        1
        for cliente in clientes
        if normalizar_texto(cliente.status_cliente)
        == "ativo"
    )

    # ========================================================
    # PROJETOS
    # ========================================================

    projetos = db.session.query(Projeto).all()

    if busca:
        termo_busca = normalizar_texto(busca)

        projetos = [
            projeto
            for projeto in projetos
            if termo_busca
            in normalizar_texto(projeto.nome_projeto)
        ]

    projetos_andamento = sum(
        1
        for projeto in projetos
        if normalizar_texto(projeto.status_projeto)
        == "em andamento"
    )

    projetos_por_status_dict = {}

    for projeto in projetos:

        status_projeto = (
            projeto.status_projeto
            or "Não informado"
        )

        projetos_por_status_dict[status_projeto] = (
            projetos_por_status_dict.get(
                status_projeto,
                0
            ) + 1
        )

    projetos_por_status = [
        {
            "status": status_projeto,
            "quantidade": quantidade,
        }
        for status_projeto, quantidade
        in sorted(
            projetos_por_status_dict.items(),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    # ========================================================
    # PAGAMENTOS
    # ========================================================

    pagamentos = db.session.query(Pagamento).all()

    # --------------------------------------------------------
    # PAGAMENTOS EM ABERTO
    #
    # Pendente + Atrasado = ainda não recebidos
    # --------------------------------------------------------

    pagamentos_pendentes_lista = [
        pagamento
        for pagamento in pagamentos
        if normalizar_texto(
            pagamento.status_pagamento
        ) in ["pendente", "atrasado"]
    ]

    # --------------------------------------------------------
    # PAGAMENTOS PAGOS
    # --------------------------------------------------------

    pagamentos_pagos_lista = [
        pagamento
        for pagamento in pagamentos
        if normalizar_texto(
            pagamento.status_pagamento
        ) == "pago"
    ]

    # --------------------------------------------------------
    # QUANTIDADE DE PAGAMENTOS PENDENTES
    # --------------------------------------------------------

    pagamentos_pendentes = len(
        pagamentos_pendentes_lista
    )

    # --------------------------------------------------------
    # VALOR TOTAL DOS PAGAMENTOS PENDENTES
    # --------------------------------------------------------

    valor_pagamentos_pendentes = sum(
        converter_valor(pagamento.valor)
        for pagamento in pagamentos_pendentes_lista
    )

    # --------------------------------------------------------
    # RECEITA
    #
    # Somente pagamentos com status Pago
    # --------------------------------------------------------

    receita = sum(
        converter_valor(pagamento.valor)
        for pagamento in pagamentos_pagos_lista
    )

    # ========================================================
    # PAGAMENTOS POR STATUS
    # ========================================================

    pagamentos_status_dict = {}

    for pagamento in pagamentos:

        status_pagamento = (
            pagamento.status_pagamento
            or "Não informado"
        )

        pagamentos_status_dict[status_pagamento] = (
            pagamentos_status_dict.get(
                status_pagamento,
                0
            ) + 1
        )

    pagamentos_por_status = [
        {
            "status": status_pagamento,
            "quantidade": quantidade,
        }
        for status_pagamento, quantidade
        in sorted(
            pagamentos_status_dict.items(),
            key=lambda item: item[1],
            reverse=True
        )
    ]

    # ========================================================
    # PLANOS RECORRENTES
    # ========================================================

    planos = db.session.query(
        PlanoRecorrente
    ).all()

    planos_ativos_lista = [
        plano
        for plano in planos
        if normalizar_texto(
            plano.status_plano
        ) == "ativo"
    ]

    planos_ativos = len(
        planos_ativos_lista
    )

    # ========================================================
    # MRR
    #
    # Somente planos com status Ativo
    # ========================================================

    mrr = sum(
        converter_valor(plano.valor_mensal)
        for plano in planos_ativos_lista
    )

    # ========================================================
    # PRÓXIMAS AÇÕES
    # ========================================================

    proximas_acoes = []

    proximas_acoes_leads = (
        db.session.query(Lead)
        .filter(
            Lead.data_proxima_acao.isnot(None)
        )
        .order_by(
            Lead.data_proxima_acao.asc(),
            Lead.horario_proxima_acao.asc()
        )
        .limit(20)
        .all()
    )

    for lead in proximas_acoes_leads:

        if busca:
            termo_busca = normalizar_texto(busca)

            if (
                termo_busca
                not in normalizar_texto(
                    lead.nome_empresa
                )
                and termo_busca
                not in normalizar_texto(
                    lead.nome_contato
                )
            ):
                continue

        proximas_acoes.append({
            "origem": "lead",
            "id": lead.id,
            "empresa": lead.nome_empresa,
            "responsavel": lead.responsavel,
            "acao": lead.proxima_acao,
            "data": (
                lead.data_proxima_acao.isoformat()
                if lead.data_proxima_acao
                else None
            ),
            "horario": (
                lead.horario_proxima_acao.strftime(
                    "%H:%M"
                )
                if lead.horario_proxima_acao
                else None
            ),
            "prioridade": lead.prioridade,
            "status": lead.status_lead,
        })

    # --------------------------------------------------------
    # INTERAÇÕES
    # --------------------------------------------------------

    proximas_interacoes = (
        db.session.query(Interacao)
        .filter(
            Interacao.data_proxima_acao.isnot(None)
        )
        .order_by(
            Interacao.data_proxima_acao.asc()
        )
        .limit(20)
        .all()
    )

    for interacao in proximas_interacoes:

        empresa = None

        if interacao.lead:
            empresa = interacao.lead.nome_empresa

        elif interacao.cliente:
            empresa = interacao.cliente.nome_empresa

        if busca:
            termo_busca = normalizar_texto(busca)

            if (
                termo_busca
                not in normalizar_texto(empresa)
            ):
                continue

        proximas_acoes.append({
            "origem": "interacao",
            "id": interacao.id,
            "empresa": empresa,
            "responsavel": interacao.responsavel,
            "acao": interacao.proxima_acao,
            "data": (
                interacao.data_proxima_acao.isoformat()
                if interacao.data_proxima_acao
                else None
            ),
            "horario": None,
            "prioridade": None,
            "status": None,
        })

    proximas_acoes.sort(
        key=lambda item: (
            item["data"] or "9999-12-31",
            item["horario"] or "23:59"
        )
    )

    proximas_acoes = proximas_acoes[:10]

    # ========================================================
    # INDICADORES
    # ========================================================

    taxa_conversao = percentual(
        leads_convertidos,
        total_leads
    )

    taxa_perda = percentual(
        leads_perdidos,
        total_leads
    )

    # ========================================================
    # OPÇÕES PARA OS FILTROS
    # ========================================================

    todos_leads = db.session.query(Lead).all()

    lista_responsaveis = sorted({
        lead.responsavel
        for lead in todos_leads
        if lead.responsavel
    })

    lista_origens = sorted({
        lead.origem_lead
        for lead in todos_leads
        if lead.origem_lead
    })

    lista_ramos = sorted({
        lead.ramo
        for lead in todos_leads
        if lead.ramo
    })

    lista_status = sorted({
        lead.status_lead
        for lead in todos_leads
        if lead.status_lead
    })

    lista_etapas = etapas

    # ========================================================
    # RESPOSTA
    # ========================================================

    return jsonify({

        "filtros": {
            "responsaveis": lista_responsaveis,
            "origens": lista_origens,
            "ramos": lista_ramos,
            "status": lista_status,
            "etapas": lista_etapas,
        },

        "filtros_aplicados": {
            "periodo": periodo,
            "busca": busca,
            "responsavel": responsavel,
            "origem": origem,
            "ramo": ramo,
            "status": status,
            "etapa": etapa,
            "data_inicio": data_inicio,
            "data_fim": data_fim,
        },

        "leads": {
            "total": total_leads,
            "novos": leads_novos,
            "andamento": leads_andamento,
            "convertidos": leads_convertidos,
            "perdidos": leads_perdidos,
        },

        "clientes": {
            "ativos": clientes_ativos,
        },

        "projetos": {
            "andamento": projetos_andamento,
            "total": len(projetos),
        },

        "pagamentos": {
            "pendentes": pagamentos_pendentes,
            "valor_pendente": round(
                valor_pagamentos_pendentes,
                2
            ),
            "receita": round(
                receita,
                2
            ),
        },

        "planos": {
            "ativos": planos_ativos,
            "mrr": round(
                mrr,
                2
            ),
        },

        "proximas_acoes": proximas_acoes,

        "indicadores": {
            "taxa_conversao": taxa_conversao,
            "taxa_perda": taxa_perda,
            "valor_potencial": round(
                valor_potencial,
                2
            ),
            "ticket_potencial_medio": round(
                ticket_potencial_medio,
                2
            ),
        },

        "funil": funil,

        "graficos": {
            "leads_por_origem": leads_por_origem,
            "leads_por_responsavel": leads_por_responsavel,
            "leads_por_ramo": leads_por_ramo,
            "motivos_de_perda": motivos_de_perda,
            "evolucao_leads": evolucao_leads,
            "projetos_por_status": projetos_por_status,
            "pagamentos_por_status": pagamentos_por_status,
        },
    })