from flask import Blueprint, request, jsonify
from datetime import datetime, date, time

from backend.database import db
from backend.models import Lead
from backend.conversao import converter_lead_em_cliente

leads_bp = Blueprint("leads", __name__, url_prefix="/leads")


# ============================================================
# OPÇÕES VÁLIDAS (CANÔNICAS)
# ============================================================

RAMOS = [
    "Academia",
    "Advocacia",
    "Agronegócio",
    "Arquitetura",
    "Autoescola",
    "Automotivo",
    "Barbearia",
    "Beleza",
    "Clínica",
    "Contabilidade",
    "Construção",
    "Consultoria",
    "Dentista",
    "Educação",
    "Engenharia",
    "Eventos",
    "Farmácia",
    "Fotografia",
    "Hotelaria",
    "Imobiliária",
    "Indústria",
    "Informática/Tecnologia",
    "Marketing",
    "Oficina Mecânica",
    "Pet Shop",
    "Restaurante",
    "Salão de Beleza",
    "Saúde",
    "Serviços",
    "Turismo",
    "Varejo",
    "Veículos",
    "Outro",
]

TEM_SITE = [
    "Não",
    "Sim",
    "Em desenvolvimento",
    "Desatualizado",
    "Com problemas",
]

ABORDADO = [
    "Não",
    "Sim",
]

TIPOS_PRIMEIRO_CONTATO = [
    "WhatsApp",
    "Ligação",
    "Instagram",
    "E-mail",
    "Indicação",
    "Site",
    "Presencial",
    "Outro",
]

ORIGENS = [
    "Prospecção ativa",
    "Instagram",
    "WhatsApp",
    "Indicação",
    "Google",
    "Google Maps",
    "Site TechDias",
    "Facebook",
    "LinkedIn",
    "Evento",
    "Networking",
    "Cliente antigo",
    "Parceiro",
    "Outro",
]

STATUS_LEAD = [
    "Novo",
    "Em andamento",
    "Perdido",
    "Convertido",
    "Ex-Cliente",
]

# Status controlados pelo sistema:
# não podem ser escolhidos manualmente.
#   Convertido -> marcando "Converter em cliente"
#   Ex-Cliente -> excluindo o cliente vinculado
STATUS_AUTOMATICOS = {
    "Convertido",
    "Ex-Cliente",
}

ETAPAS_COMERCIAIS = [
    "Novo Lead",
    "Primeiro Contato",
    "Aguardando Resposta",
    "Respondeu",
    "Qualificação",
    "Qualificado",
    "Briefing Pendente",
    "Briefing Agendado",
    "Briefing Realizado",
    "Proposta em Preparação",
    "Orçamento Enviado",
    "Aguardando Retorno do Orçamento",
    "Negociação",
    "Aguardando Decisão",
    "Aprovado Verbalmente",
    "Contrato Enviado",
    "Contrato Assinado",
    "Aguardando Pagamento",
    "Fechado",
    "Perdido",
    "Ex-Cliente",
]

NIVEIS_INTERESSE = [
    "Baixo",
    "Médio",
    "Alto",
    "Muito Alto",
]

POTENCIAIS_VALORES = [
    "Até R$500",
    "R$500–1.000",
    "R$1.000–2.000",
    "R$2.000–3.000",
    "R$3.000–5.000",
    "R$5.000–10.000",
    "Acima de R$10.000",
    "Não informado",
]

TIPOS_SITE = [
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
    "Não definido",
]

OBJETIVOS_SITE = [
    "Gerar mais contatos",
    "Gerar vendas",
    "Divulgar a empresa",
    "Apresentar serviços",
    "Apresentar produtos",
    "Receber pedidos pelo WhatsApp",
    "Melhorar presença digital",
    "Aumentar credibilidade",
    "Aparecer no Google",
    "Captar leads",
    "Vender online",
    "Permitir agendamentos",
    "Apresentar portfólio",
    "Melhorar imagem da empresa",
    "Substituir site antigo",
    "Centralizar informações",
    "Outro",
]

PRAZOS = [
    "Até 7 dias",
    "15 dias",
    "30 dias",
    "1–3 meses",
    "3–6 meses",
    "+6 meses",
    "Sem prazo",
]

DECISORES = [
    "Proprietário",
    "Sócio",
    "Diretor",
    "Gerente",
    "Marketing",
    "TI",
    "Administrativo",
    "Financeiro",
    "Outro",
    "Não informado",
]

PROXIMAS_ACOES = [
    "Nenhuma",
    "Fazer primeiro contato",
    "Fazer follow-up",
    "Enviar apresentação",
    "Enviar portfólio",
    "Enviar briefing",
    "Agendar reunião",
    "Realizar reunião",
    "Enviar orçamento",
    "Reenviar orçamento",
    "Negociar proposta",
    "Aguardar resposta",
    "Enviar contrato",
    "Solicitar assinatura",
    "Solicitar pagamento",
    "Confirmar pagamento",
    "Solicitar materiais",
    "Entrar em contato novamente",
    "Fazer pós-venda",
    "Oferecer plano mensal",
    "Oferecer serviço adicional",
    "Outro",
]

PRIORIDADES = [
    "Baixa",
    "Normal",
    "Alta",
    "Urgente",
]

MOTIVOS_PERDA = [
    "Preço",
    "Sem orçamento",
    "Sem interesse",
    "Projeto adiado",
    "Escolheu concorrente",
    "Já possui fornecedor",
    "Não respondeu",
    "Contato inválido",
    "Empresa encerrou atividades",
    "Projeto cancelado",
    "Prazo incompatível",
    "Condições de pagamento",
    "Não conseguimos contato",
    "Outro",
]

PRESENCA_DIGITAL = [
    "Instagram",
    "Facebook",
    "TikTok",
    "LinkedIn",
    "Google",
    "WhatsApp Business",
    "Site",
    "E-commerce",
    "Nenhuma",
]


# ============================================================
# MAPAS DE COMPATIBILIDADE
# ============================================================

MAPA_STATUS = {
    "novo": "Novo",
    "em andamento": "Em andamento",
    "perdido": "Perdido",
    "convertido": "Convertido",
    "ex-cliente": "Ex-Cliente",
    "ex cliente": "Ex-Cliente",
    "excliente": "Ex-Cliente",
}

MAPA_INTERESSE = {
    "baixo": "Baixo",
    "medio": "Médio",
    "médio": "Médio",
    "alto": "Alto",
    "muito alto": "Muito Alto",
    "muito_alto": "Muito Alto",
}

MAPA_PRIORIDADE = {
    "baixa": "Baixa",
    "normal": "Normal",
    "alta": "Alta",
    "urgente": "Urgente",
}

MAPA_ABORDADO = {
    "sim": "Sim",
    "não": "Não",
    "nao": "Não",
}

MAPA_SITE = {
    "sim": "Sim",
    "não": "Não",
    "nao": "Não",
    "em desenvolvimento": "Em desenvolvimento",
    "desatualizado": "Desatualizado",
    "com problemas": "Com problemas",
}


# ============================================================
# CAMPOS
# ============================================================

CAMPOS_PERMITIDOS = {
    "nome_empresa",
    "nome_contato",
    "telefone",
    "email",
    "cidade",
    "ramo",
    "ramo_personalizado",
    "abordado",
    "site",
    "presenca_digital",
    "tipo_primeiro_contato",
    "origem_lead",
    "responsavel",
    "status_lead",
    "etapa_comercial",
    "nivel_interesse",
    "potencial_valor",
    "tipo_site",
    "objetivo_site",
    "prazo_interesse",
    "decisor",
    "proxima_acao",
    "data_proxima_acao",
    "horario_proxima_acao",
    "prioridade",
    "data_primeiro_contato",
    "data_ultimo_contato",
    "data_conversao",
    "motivo_perda",
    "motivo_perda_personalizado",
    "observacoes",
}

CAMPOS_TEXTO_OPCIONAIS = {
    "nome_contato",
    "telefone",
    "email",
    "cidade",
    "ramo_personalizado",
    "responsavel",
    "motivo_perda_personalizado",
    "observacoes",
}


# ============================================================
# NORMALIZAÇÃO
# ============================================================

def normalizar_texto(valor):
    if valor is None:
        return None

    if isinstance(valor, str):
        valor = valor.strip()

        if valor == "":
            return None

        return valor

    return valor


def normalizar_e_validar_opcao(
    campo,
    valor,
    opcoes_validas,
    mapa_compatibilidade=None,
    obrigatorio=False
):
    v = normalizar_texto(valor)

    if v is None:
        if obrigatorio:
            raise ValueError(
                f"Valor inválido para '{campo}'. "
                f"Valores permitidos: {', '.join(opcoes_validas)}."
            )

        return None

    if mapa_compatibilidade:
        v_lower = v.lower()

        if v_lower in mapa_compatibilidade:
            return mapa_compatibilidade[v_lower]

    if v in opcoes_validas:
        return v

    for opt in opcoes_validas:
        if opt.lower() == v.lower():
            return opt

    v_dash = v.replace("-", "–")

    for opt in opcoes_validas:
        if opt.lower() == v_dash.lower():
            return opt

    raise ValueError(
        f"Valor inválido para '{campo}'. "
        f"Valores permitidos: {', '.join(opcoes_validas)}."
    )


def normalizar_e_validar_lista(campo, valor, opcoes_validas):
    if valor is None or valor == "":
        return []

    if isinstance(valor, str):
        v_str = valor.strip()

        if not v_str:
            return []

        itens = [v_str]

    elif isinstance(valor, list):
        itens = valor

    else:
        raise ValueError(f"'{campo}' deve ser uma lista.")

    resultado = []
    invalidos = []

    for item in itens:
        item_norm = normalizar_texto(item)

        if not item_norm:
            continue

        matched = None

        if item_norm in opcoes_validas:
            matched = item_norm

        else:
            for opt in opcoes_validas:
                if opt.lower() == item_norm.lower():
                    matched = opt
                    break

        if matched:
            if matched not in resultado:
                resultado.append(matched)

        else:
            invalidos.append(item_norm)

    if invalidos:
        raise ValueError(
            f"Valor inválido para '{campo}'. "
            f"Valores permitidos: {', '.join(opcoes_validas)}."
        )

    return resultado


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

    raise ValueError(
        f"Formato de data inválido para '{campo}'."
    )


def converter_horario(campo, valor):
    if valor is None:
        return None

    if isinstance(valor, time):
        return valor

    if isinstance(valor, str):
        v = valor.strip()

        if not v:
            return None

        for fmt in ("%H:%M", "%H:%M:%S"):
            try:
                return datetime.strptime(v, fmt).time()
            except ValueError:
                pass

        raise ValueError(
            f"Horário inválido para '{campo}': '{valor}'. "
            f"Use o formato HH:MM."
        )

    raise ValueError(
        f"Formato de horário inválido para '{campo}'."
    )


# ============================================================
# PREPARAÇÃO DOS DADOS
# ============================================================

def preparar_dados(data, is_update=False, lead_atual=None):

    if not isinstance(data, dict):
        raise ValueError("Formato de dados inválido.")

    # --------------------------------------------------------
    # 1. Filtra somente campos permitidos
    # --------------------------------------------------------

    dados = {
        campo: valor
        for campo, valor in data.items()
        if campo in CAMPOS_PERMITIDOS
    }

    # --------------------------------------------------------
    # 2. Normaliza TODAS as strings vazias
    #
    # Isso é importante para o PostgreSQL:
    #
    # ""  -> None
    # None -> NULL
    #
    # Assim uma constraint como:
    #
    # nivel_interesse IS NULL
    #
    # funciona corretamente.
    # --------------------------------------------------------

    for campo, valor in list(dados.items()):

        if isinstance(valor, str):
            valor_normalizado = valor.strip()

            if valor_normalizado == "":
                dados[campo] = None

            else:
                dados[campo] = valor_normalizado

    # --------------------------------------------------------
    # 3. Campo obrigatório: nome_empresa
    # --------------------------------------------------------

    if not is_update:

        if (
            "nome_empresa" not in dados
            or not normalizar_texto(dados.get("nome_empresa"))
        ):
            raise ValueError(
                "O campo 'nome_empresa' é obrigatório."
            )

        dados["nome_empresa"] = normalizar_texto(
            dados["nome_empresa"]
        )

    else:

        if "nome_empresa" in dados:

            nome_empresa = normalizar_texto(
                dados["nome_empresa"]
            )

            if not nome_empresa:
                raise ValueError(
                    "O campo 'nome_empresa' não pode ser vazio."
                )

            dados["nome_empresa"] = nome_empresa

    # --------------------------------------------------------
    # 4. Campos de texto opcionais
    # --------------------------------------------------------

    for campo in CAMPOS_TEXTO_OPCIONAIS:

        if campo in dados:
            dados[campo] = normalizar_texto(
                dados[campo]
            )

    # --------------------------------------------------------
    # 5. Campos de seleção
    # --------------------------------------------------------

    select_defs = [

        ("ramo", RAMOS, None, False),

        ("abordado", ABORDADO, MAPA_ABORDADO, False),

        ("site", TEM_SITE, MAPA_SITE, False),

        (
            "tipo_primeiro_contato",
            TIPOS_PRIMEIRO_CONTATO,
            None,
            False
        ),

        (
            "origem_lead",
            ORIGENS,
            None,
            False
        ),

        (
            "status_lead",
            STATUS_LEAD,
            MAPA_STATUS,
            not is_update
        ),

        (
            "etapa_comercial",
            ETAPAS_COMERCIAIS,
            None,
            not is_update
        ),

        (
            "nivel_interesse",
            NIVEIS_INTERESSE,
            MAPA_INTERESSE,
            False
        ),

        (
            "potencial_valor",
            POTENCIAIS_VALORES,
            None,
            False
        ),

        (
            "tipo_site",
            TIPOS_SITE,
            None,
            False
        ),

        (
            "prazo_interesse",
            PRAZOS,
            None,
            False
        ),

        (
            "decisor",
            DECISORES,
            None,
            False
        ),

        (
            "proxima_acao",
            PROXIMAS_ACOES,
            None,
            False
        ),

        (
            "prioridade",
            PRIORIDADES,
            MAPA_PRIORIDADE,
            False
        ),

        (
            "motivo_perda",
            MOTIVOS_PERDA,
            None,
            False
        ),
    ]

    for campo, opcoes, mapa, obrigatorio in select_defs:

        if campo not in dados:
            continue

        # Status e etapa não podem ser apagados em um PUT
        if is_update and campo in (
            "status_lead",
            "etapa_comercial"
        ):

            if dados[campo] is None:
                raise ValueError(
                    f"O campo '{campo}' não pode ser vazio."
                )

            dados[campo] = normalizar_e_validar_opcao(
                campo,
                dados[campo],
                opcoes,
                mapa_compatibilidade=mapa,
                obrigatorio=True
            )

        else:

            dados[campo] = normalizar_e_validar_opcao(
                campo,
                dados[campo],
                opcoes,
                mapa_compatibilidade=mapa,
                obrigatorio=obrigatorio
            )

    # --------------------------------------------------------
    # 6. Arrays PostgreSQL
    # --------------------------------------------------------

    if "presenca_digital" in dados:

        dados["presenca_digital"] = (
            normalizar_e_validar_lista(
                "presenca_digital",
                dados["presenca_digital"],
                PRESENCA_DIGITAL
            )
        )

    elif not is_update:

        dados["presenca_digital"] = []

    if "objetivo_site" in dados:

        dados["objetivo_site"] = (
            normalizar_e_validar_lista(
                "objetivo_site",
                dados["objetivo_site"],
                OBJETIVOS_SITE
            )
        )

    elif not is_update:

        dados["objetivo_site"] = []

    # --------------------------------------------------------
    # 7. Datas
    # --------------------------------------------------------

    campos_data = [
        "data_proxima_acao",
        "data_primeiro_contato",
        "data_ultimo_contato",
        "data_conversao",
    ]

    for campo in campos_data:

        if campo in dados:

            dados[campo] = converter_data(
                campo,
                dados[campo]
            )

    # --------------------------------------------------------
    # 8. Horário
    # --------------------------------------------------------

    if "horario_proxima_acao" in dados:

        dados["horario_proxima_acao"] = (
            converter_horario(
                "horario_proxima_acao",
                dados["horario_proxima_acao"]
            )
        )

    # --------------------------------------------------------
    # 9. Defaults para criação
    # --------------------------------------------------------

    if not is_update:

        if dados.get("abordado") is None:
            dados["abordado"] = "Não"

        if dados.get("site") is None:
            dados["site"] = "Não"

        if dados.get("status_lead") is None:
            dados["status_lead"] = "Novo"

        if dados.get("etapa_comercial") is None:
            dados["etapa_comercial"] = "Novo Lead"

        if dados.get("prioridade") is None:
            dados["prioridade"] = "Normal"

    # --------------------------------------------------------
    # 10. Regra: ramo Outro
    # --------------------------------------------------------

    ramo_final = (
        dados.get("ramo")
        if "ramo" in dados
        else (
            getattr(lead_atual, "ramo", None)
            if lead_atual
            else None
        )
    )

    if ramo_final == "Outro":

        ramo_personalizado_final = (
            dados.get("ramo_personalizado")
            if "ramo_personalizado" in dados
            else (
                getattr(
                    lead_atual,
                    "ramo_personalizado",
                    None
                )
                if lead_atual
                else None
            )
        )

        if not normalizar_texto(
            ramo_personalizado_final
        ):
            raise ValueError(
                "Informe 'ramo_personalizado' "
                "quando o ramo for 'Outro'."
            )

    # --------------------------------------------------------
    # 11. Regra: status Perdido
    # --------------------------------------------------------

    status_final = (
        dados.get("status_lead")
        if "status_lead" in dados
        else (
            getattr(lead_atual, "status_lead", None)
            if lead_atual
            else None
        )
    )

    if status_final == "Perdido":

        motivo_final = (
            dados.get("motivo_perda")
            if "motivo_perda" in dados
            else (
                getattr(
                    lead_atual,
                    "motivo_perda",
                    None
                )
                if lead_atual
                else None
            )
        )

        if not normalizar_texto(motivo_final):

            raise ValueError(
                "O campo 'motivo_perda' é obrigatório "
                "quando o status do lead é 'Perdido'."
            )

        if motivo_final == "Outro":

            motivo_personalizado_final = (
                dados.get("motivo_perda_personalizado")
                if "motivo_perda_personalizado" in dados
                else (
                    getattr(
                        lead_atual,
                        "motivo_perda_personalizado",
                        None
                    )
                    if lead_atual
                    else None
                )
            )

            if not normalizar_texto(
                motivo_personalizado_final
            ):
                raise ValueError(
                    "Informe 'motivo_perda_personalizado' "
                    "quando o motivo da perda for 'Outro'."
                )

    return dados


# ============================================================
# REGRAS DE CONVERSÃO
# ============================================================

def validar_status_automatico(dados, lead_atual=None):
    """
    'Convertido' e 'Ex-Cliente' só podem ser definidos pelo sistema.
    Manter o valor que o lead já tem é permitido.
    """

    novo = dados.get("status_lead")
    atual = lead_atual.status_lead if lead_atual else None

    if novo in STATUS_AUTOMATICOS and novo != atual:
        raise ValueError(
            "Os status 'Convertido' e 'Ex-Cliente' são definidos "
            "automaticamente. Use a opção 'Converter em cliente'."
        )


# ============================================================
# GET - LISTAR
# ============================================================

@leads_bp.route("", methods=["GET"], strict_slashes=False)
@leads_bp.route("/", methods=["GET"], strict_slashes=False)
def listar_leads():

    leads = (
        Lead.query
        .order_by(Lead.id.desc())
        .all()
    )

    return jsonify(
        [lead.to_dict() for lead in leads]
    ), 200


# ============================================================
# GET - BUSCAR POR ID
# ============================================================

@leads_bp.route("/<int:id>", methods=["GET"], strict_slashes=False)
def buscar_lead(id):

    lead = db.session.get(Lead, id)

    if not lead:
        return jsonify({
            "erro": "Lead não encontrado."
        }), 404

    return jsonify(
        lead.to_dict()
    ), 200


# ============================================================
# POST - CRIAR
# ============================================================

@leads_bp.route("", methods=["POST"], strict_slashes=False)
@leads_bp.route("/", methods=["POST"], strict_slashes=False)
def criar_lead():

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    try:

        dados = preparar_dados(
            data,
            is_update=False
        )

        validar_status_automatico(dados)

        lead = Lead(**dados)

        db.session.add(lead)

        db.session.commit()

        return jsonify(
            lead.to_dict()
        ), 201

    except ValueError as erro:

        db.session.rollback()

        return jsonify({
            "erro": str(erro)
        }), 400

    except Exception as erro:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao criar lead.",
            "detalhes": str(erro)
        }), 500


# ============================================================
# PUT - ATUALIZAR
# ============================================================

@leads_bp.route("/<int:id>", methods=["PUT"], strict_slashes=False)
def atualizar_lead(id):

    lead = db.session.get(Lead, id)

    if not lead:

        return jsonify({
            "erro": "Lead não encontrado."
        }), 404

    data = request.get_json(silent=True)

    if not data or not isinstance(data, dict):

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    # Caixa "Converter em cliente"
    converter = data.get("converter_em_cliente") is True

    try:

        dados = preparar_dados(
            data,
            is_update=True,
            lead_atual=lead
        )

        # Lead vinculado a um cliente: status e etapa ficam travados
        if lead.cliente:

            for campo in ("status_lead", "etapa_comercial"):

                if (
                    campo in dados
                    and dados[campo] != getattr(lead, campo)
                ):
                    raise ValueError(
                        "Este lead está vinculado a um cliente. "
                        "Status e etapa só podem ser alterados "
                        "excluindo o cliente."
                    )

        validar_status_automatico(dados, lead)

        for campo, valor in dados.items():

            setattr(
                lead,
                campo,
                valor
            )

        if converter:
            converter_lead_em_cliente(lead)

        db.session.commit()

        return jsonify(
            lead.to_dict()
        ), 200

    except ValueError as erro:

        db.session.rollback()

        return jsonify({
            "erro": str(erro)
        }), 400

    except Exception as erro:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao atualizar lead.",
            "detalhes": str(erro)
        }), 500


# ============================================================
# DELETE - EXCLUIR
# ============================================================

@leads_bp.route("/<int:id>", methods=["DELETE"], strict_slashes=False)
def excluir_lead(id):

    lead = db.session.get(Lead, id)

    if not lead:

        return jsonify({
            "erro": "Lead não encontrado."
        }), 404

    # Lead vinculado a um cliente não pode ser excluído
    if lead.cliente:

        return jsonify({
            "erro": (
                f"Este lead está vinculado ao cliente "
                f"'{lead.cliente.nome_empresa}' e não pode ser excluído. "
                f"Exclua o cliente primeiro: o lead passará a Ex-Cliente."
            )
        }), 409

    try:

        db.session.delete(lead)

        db.session.commit()

        return jsonify({
            "mensagem": "Lead excluído com sucesso."
        }), 200

    except Exception as erro:

        db.session.rollback()

        return jsonify({
            "erro": "Erro ao excluir lead.",
            "detalhes": str(erro)
        }), 500