from datetime import date

from backend.database import db
from backend.models import Cliente


STATUS_CONVERTIDO = "Convertido"
STATUS_EX_CLIENTE = "Ex-Cliente"

ETAPA_FECHADO = "Fechado"
ETAPA_EX_CLIENTE = "Ex-Cliente"


def validar_conversao(lead):
    """
    Levanta ValueError se o lead não puder ser convertido em cliente.
    """

    if lead.cliente is not None:
        raise ValueError("Este lead já está vinculado a um cliente.")

    if lead.status_lead == "Perdido":
        raise ValueError(
            "Um lead perdido não pode ser convertido em cliente. "
            "Altere o status antes de converter."
        )


def marcar_lead_convertido(lead, data_conversao=None):
    """
    Lead continua em Leads, com status Convertido e etapa Fechado.
    """

    lead.status_lead = STATUS_CONVERTIDO
    lead.etapa_comercial = ETAPA_FECHADO
    lead.data_conversao = data_conversao or date.today()


def marcar_lead_ex_cliente(lead):
    """
    Chamado quando o cliente vinculado é excluído.
    O lead permanece em Leads como Ex-Cliente.
    """

    lead.status_lead = STATUS_EX_CLIENTE
    lead.etapa_comercial = ETAPA_EX_CLIENTE


def converter_lead_em_cliente(lead):
    """
    Cria o cliente a partir dos dados do lead e vincula os dois.
    Não faz commit: quem chama decide quando confirmar.
    """

    validar_conversao(lead)

    hoje = date.today()

    ramo = lead.ramo

    if ramo == "Outro" and lead.ramo_personalizado:
        ramo = lead.ramo_personalizado

    cliente = Cliente(
        lead=lead,
        nome_empresa=lead.nome_empresa,
        nome_contato=lead.nome_contato,
        telefone=lead.telefone,
        email=lead.email,
        cidade=lead.cidade,
        ramo=ramo,
        origem_cliente=lead.origem_lead,
        status_cliente="Ativo",
        data_conversao=hoje,
    )

    db.session.add(cliente)

    marcar_lead_convertido(lead, hoje)

    return cliente