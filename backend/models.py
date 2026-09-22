from backend.database import db


# ============================================================
# 1. LEADS - PROSPECÇÃO
# ============================================================

class Lead(db.Model):
    __tablename__ = "leads_prospeccao"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # --------------------------------------------------------
    # Dados básicos
    # --------------------------------------------------------

    nome_empresa = db.Column(
        db.String(255),
        nullable=False
    )

    nome_contato = db.Column(
        db.String(255)
    )

    telefone = db.Column(
        db.String(50)
    )

    email = db.Column(
        db.String(255)
    )

    cidade = db.Column(
        db.String(255)
    )

    ramo = db.Column(
        db.String(255)
    )

    ramo_personalizado = db.Column(
        db.String(255)
    )

    # --------------------------------------------------------
    # Presença digital
    # --------------------------------------------------------

    presenca_digital = db.Column(
        db.ARRAY(db.String)
    )

    site = db.Column(
        db.String(100),
        default="Não"
    )

    # --------------------------------------------------------
    # Primeiro contato
    # --------------------------------------------------------

    abordado = db.Column(
        db.String(20),
        default="Não"
    )

    tipo_primeiro_contato = db.Column(
        db.String(100)
    )

    origem_lead = db.Column(
        db.String(100)
    )

    # --------------------------------------------------------
    # Comercial
    # --------------------------------------------------------

    responsavel = db.Column(
        db.String(255)
    )

    status_lead = db.Column(
        db.String(50),
        default="Novo"
    )

    etapa_comercial = db.Column(
        db.String(100),
        default="Novo Lead"
    )

    nivel_interesse = db.Column(
        db.String(50)
    )

    potencial_valor = db.Column(
        db.String(100)
    )

    tipo_site = db.Column(
        db.String(100)
    )

    objetivo_site = db.Column(
        db.ARRAY(db.String)
    )

    prazo_interesse = db.Column(
        db.String(100)
    )

    decisor = db.Column(
        db.String(100)
    )

    # --------------------------------------------------------
    # Próxima ação
    # --------------------------------------------------------

    proxima_acao = db.Column(
        db.String(150)
    )

    data_proxima_acao = db.Column(
        db.Date
    )

    horario_proxima_acao = db.Column(
        db.Time
    )

    prioridade = db.Column(
        db.String(50),
        default="Normal"
    )

    # --------------------------------------------------------
    # Datas automáticas
    # --------------------------------------------------------

    data_primeiro_contato = db.Column(
        db.Date
    )

    data_ultimo_contato = db.Column(
        db.Date
    )

    data_conversao = db.Column(
        db.Date
    )

    # --------------------------------------------------------
    # Perda
    # --------------------------------------------------------

    motivo_perda = db.Column(
        db.String(150)
    )

    motivo_perda_personalizado = db.Column(
        db.Text
    )

    # --------------------------------------------------------
    # Observações
    # --------------------------------------------------------

    observacoes = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now()
    )

    # --------------------------------------------------------
    # Relacionamentos
    # --------------------------------------------------------

    # Histórico de interações do lead.
    #
    # cascade="save-update, merge, delete" + passive_deletes=True
    #   -> ao excluir o lead, as interações dele são excluídas pelo
    #      banco (ON DELETE CASCADE). O SQLAlchemy NÃO tenta zerar
    #      interacoes.lead_id (o que violaria o CHECK de "exatamente
    #      um vínculo").
    # Não usar "delete-orphan": a Interacao tem dois pais possíveis
    # (Lead e Cliente) e o SQLAlchemy a trataria como órfã.
    interacoes = db.relationship(
        "Interacao",
        back_populates="lead",
        lazy=True,
        cascade="save-update, merge, delete",
        passive_deletes=True
    )

    # Cliente gerado a partir deste lead (no máximo 1).
    #
    # lazy="selectin"      -> carrega os clientes de todos os leads
    #                         de uma vez na listagem (evita N+1).
    # passive_deletes="all" -> ao excluir um lead, o SQLAlchemy NÃO
    #                         tenta zerar clientes.lead_id. Quem bloqueia
    #                         é a FK no banco (e a rota, com 409).
    cliente = db.relationship(
        "Cliente",
        back_populates="lead",
        uselist=False,
        lazy="selectin",
        passive_deletes="all"
    )

    # --------------------------------------------------------
    # SERIALIZAÇÃO
    # --------------------------------------------------------

    def to_dict(self):
        return {
            "id": self.id,

            "nome_empresa": self.nome_empresa,
            "nome_contato": self.nome_contato,
            "telefone": self.telefone,
            "email": self.email,
            "cidade": self.cidade,

            "ramo": self.ramo,
            "ramo_personalizado": self.ramo_personalizado,

            "abordado": self.abordado,
            "site": self.site,

            "presenca_digital": self.presenca_digital or [],

            "tipo_primeiro_contato": self.tipo_primeiro_contato,
            "origem_lead": self.origem_lead,

            "responsavel": self.responsavel,

            "status_lead": self.status_lead,
            "etapa_comercial": self.etapa_comercial,
            "nivel_interesse": self.nivel_interesse,

            "potencial_valor": self.potencial_valor,
            "tipo_site": self.tipo_site,

            "objetivo_site": self.objetivo_site or [],

            "prazo_interesse": self.prazo_interesse,
            "decisor": self.decisor,

            "proxima_acao": self.proxima_acao,

            "data_proxima_acao": (
                self.data_proxima_acao.isoformat()
                if self.data_proxima_acao
                else None
            ),

            "horario_proxima_acao": (
                self.horario_proxima_acao.strftime("%H:%M")
                if self.horario_proxima_acao
                else None
            ),

            "prioridade": self.prioridade,

            "data_primeiro_contato": (
                self.data_primeiro_contato.isoformat()
                if self.data_primeiro_contato
                else None
            ),

            "data_ultimo_contato": (
                self.data_ultimo_contato.isoformat()
                if self.data_ultimo_contato
                else None
            ),

            "data_conversao": (
                self.data_conversao.isoformat()
                if self.data_conversao
                else None
            ),

            "motivo_perda": self.motivo_perda,
            "motivo_perda_personalizado": self.motivo_perda_personalizado,

            "observacoes": self.observacoes,

            # Id do cliente vinculado (None se não houver)
            "cliente_id": (
                self.cliente.id
                if self.cliente
                else None
            ),

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


# ============================================================
# 2. CLIENTES
# ============================================================

class Cliente(db.Model):
    __tablename__ = "clientes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    nome_empresa = db.Column(
        db.String(255),
        nullable=False
    )

    nome_contato = db.Column(
        db.String(255)
    )

    telefone = db.Column(
        db.String(50)
    )

    email = db.Column(
        db.String(255)
    )

    cidade = db.Column(
        db.String(255)
    )

    ramo = db.Column(
        db.String(255)
    )

    link_site = db.Column(
        db.String(500)
    )

    status_cliente = db.Column(
        db.String(50),
        default="Ativo"
    )

    tipo_cliente = db.Column(
        db.String(100)
    )

    origem_cliente = db.Column(
        db.String(100)
    )

    data_conversao = db.Column(
        db.Date
    )

    valor_medio = db.Column(
        db.Numeric(10, 2)
    )

    ultimo_contato = db.Column(
        db.Date
    )

    proximo_contato = db.Column(
        db.Date
    )

    motivo_inativacao = db.Column(
        db.String(150)
    )

    # Lead de origem (1 lead -> no máximo 1 cliente)
    lead_id = db.Column(
        db.Integer,
        db.ForeignKey("leads_prospeccao.id"),
        nullable=True,
        unique=True
    )

    observacoes = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now()
    )

    # --------------------------------------------------------
    # Relacionamentos
    # --------------------------------------------------------

    lead = db.relationship(
        "Lead",
        back_populates="cliente"
    )

    projetos = db.relationship(
        "Projeto",
        back_populates="cliente",
        lazy=True
    )

    pagamentos = db.relationship(
        "Pagamento",
        back_populates="cliente",
        lazy=True
    )

    planos = db.relationship(
        "PlanoRecorrente",
        back_populates="cliente",
        lazy=True
    )

    # Histórico de interações do cliente (mesma lógica do Lead:
    # ao excluir o cliente, o banco exclui as interações dele).
    interacoes = db.relationship(
        "Interacao",
        back_populates="cliente",
        lazy=True,
        cascade="save-update, merge, delete",
        passive_deletes=True
    )

    # --------------------------------------------------------
    # SERIALIZAÇÃO
    # --------------------------------------------------------

    def to_dict(self):
        return {
            "id": self.id,

            "nome_empresa": self.nome_empresa,
            "nome_contato": self.nome_contato,
            "telefone": self.telefone,
            "email": self.email,
            "cidade": self.cidade,
            "ramo": self.ramo,
            "link_site": self.link_site,

            "status_cliente": self.status_cliente,
            "tipo_cliente": self.tipo_cliente,
            "origem_cliente": self.origem_cliente,

            "data_conversao": (
                self.data_conversao.isoformat()
                if self.data_conversao
                else None
            ),

            "valor_medio": (
                float(self.valor_medio)
                if self.valor_medio is not None
                else None
            ),

            "ultimo_contato": (
                self.ultimo_contato.isoformat()
                if self.ultimo_contato
                else None
            ),

            "proximo_contato": (
                self.proximo_contato.isoformat()
                if self.proximo_contato
                else None
            ),

            "motivo_inativacao": self.motivo_inativacao,

            "lead_id": self.lead_id,

            "observacoes": self.observacoes,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


# ============================================================
# 3. PROJETOS
# ============================================================

class Projeto(db.Model):
    __tablename__ = "projetos"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    cliente_id = db.Column(
        db.Integer,
        db.ForeignKey("clientes.id"),
        nullable=False
    )

    nome_projeto = db.Column(
        db.String(255),
        nullable=False
    )

    tipo_projeto = db.Column(
        db.String(100)
    )

    plano = db.Column(
        db.String(100)
    )

    status_projeto = db.Column(
        db.String(100),
        default="Briefing"
    )

    responsavel = db.Column(
        db.String(255)
    )

    prioridade = db.Column(
        db.String(50),
        default="Normal"
    )

    data_inicio = db.Column(
        db.Date
    )

    data_previsao = db.Column(
        db.Date
    )

    data_entrega = db.Column(
        db.Date
    )

    valor_projeto = db.Column(
        db.Numeric(10, 2)
    )

    # O banco utiliza TEXT
    link_projeto = db.Column(
        db.Text
    )

    # IMPORTANTE:
    # O nome real da coluna no Supabase é "repositorio".
    repositorio = db.Column(
        db.Text
    )

    # O banco utiliza TEXT
    dominio = db.Column(
        db.Text
    )

    observacoes = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now()
    )

    # --------------------------------------------------------
    # Relacionamentos
    # --------------------------------------------------------

    cliente = db.relationship(
        "Cliente",
        back_populates="projetos"
    )

    pagamentos = db.relationship(
        "Pagamento",
        back_populates="projeto",
        lazy=True
    )

    # --------------------------------------------------------
    # SERIALIZAÇÃO
    # --------------------------------------------------------

    def to_dict(self):
        return {
            "id": self.id,

            "cliente_id": self.cliente_id,

            "cliente_nome": (
                self.cliente.nome_empresa
                if self.cliente
                else None
            ),

            "nome_projeto": self.nome_projeto,
            "tipo_projeto": self.tipo_projeto,
            "plano": self.plano,
            "status_projeto": self.status_projeto,

            "responsavel": self.responsavel,
            "prioridade": self.prioridade,

            "data_inicio": (
                self.data_inicio.isoformat()
                if self.data_inicio
                else None
            ),

            "data_previsao": (
                self.data_previsao.isoformat()
                if self.data_previsao
                else None
            ),

            "data_entrega": (
                self.data_entrega.isoformat()
                if self.data_entrega
                else None
            ),

            "valor_projeto": (
                float(self.valor_projeto)
                if self.valor_projeto is not None
                else None
            ),

            "link_projeto": self.link_projeto,

            # Nome igual ao banco de dados
            "repositorio": self.repositorio,

            "dominio": self.dominio,

            "observacoes": self.observacoes,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


# ============================================================
# 4. PAGAMENTOS
# ============================================================

class Pagamento(db.Model):
    __tablename__ = "pagamentos"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    cliente_id = db.Column(
        db.Integer,
        db.ForeignKey("clientes.id"),
        nullable=False
    )

    projeto_id = db.Column(
        db.Integer,
        db.ForeignKey("projetos.id")
    )

    valor = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    tipo_pagamento = db.Column(
        db.String(100)
    )

    numero_parcela = db.Column(
        db.Integer
    )

    total_parcelas = db.Column(
        db.Integer
    )

    data_vencimento = db.Column(
        db.Date
    )

    data_pagamento = db.Column(
        db.Date
    )

    status_pagamento = db.Column(
        db.String(50),
        default="Pendente"
    )

    forma_pagamento = db.Column(
        db.String(100)
    )

    observacoes = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now()
    )

    # --------------------------------------------------------
    # Relacionamentos
    # --------------------------------------------------------

    cliente = db.relationship(
        "Cliente",
        back_populates="pagamentos"
    )

    projeto = db.relationship(
        "Projeto",
        back_populates="pagamentos"
    )

    # --------------------------------------------------------
    # SERIALIZAÇÃO
    # --------------------------------------------------------

    def to_dict(self):
        return {
            "id": self.id,

            "cliente_id": self.cliente_id,

            "cliente_nome": (
                self.cliente.nome_empresa
                if self.cliente
                else None
            ),

            "projeto_id": self.projeto_id,

            "projeto_nome": (
                self.projeto.nome_projeto
                if self.projeto
                else None
            ),

            "valor": (
                float(self.valor)
                if self.valor is not None
                else None
            ),

            "tipo_pagamento": self.tipo_pagamento,

            "numero_parcela": self.numero_parcela,
            "total_parcelas": self.total_parcelas,

            "data_vencimento": (
                self.data_vencimento.isoformat()
                if self.data_vencimento
                else None
            ),

            "data_pagamento": (
                self.data_pagamento.isoformat()
                if self.data_pagamento
                else None
            ),

            "status_pagamento": self.status_pagamento,

            "forma_pagamento": self.forma_pagamento,

            "observacoes": self.observacoes,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


# ============================================================
# 5. PLANOS RECORRENTES
# ============================================================

class PlanoRecorrente(db.Model):
    __tablename__ = "planos_recorrentes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    cliente_id = db.Column(
        db.Integer,
        db.ForeignKey("clientes.id"),
        nullable=False
    )

    nome_plano = db.Column(
        db.String(100)
    )

    valor_mensal = db.Column(
        db.Numeric(10, 2)
    )

    dia_cobranca = db.Column(
        db.Integer
    )

    status_plano = db.Column(
        db.String(50),
        default="Ativo"
    )

    tipo_cobranca = db.Column(
        db.String(100)
    )

    data_inicio = db.Column(
        db.Date
    )

    proximo_vencimento = db.Column(
        db.Date
    )

    forma_pagamento = db.Column(
        db.String(100)
    )

    data_cancelamento = db.Column(
        db.Date
    )

    motivo_cancelamento = db.Column(
        db.String(150)
    )

    observacoes = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now()
    )

    # --------------------------------------------------------
    # Relacionamento
    # --------------------------------------------------------

    cliente = db.relationship(
        "Cliente",
        back_populates="planos"
    )

    # --------------------------------------------------------
    # SERIALIZAÇÃO
    # --------------------------------------------------------

    def to_dict(self):
        return {
            "id": self.id,

            "cliente_id": self.cliente_id,

            "cliente_nome": (
                self.cliente.nome_empresa
                if self.cliente
                else None
            ),

            "nome_plano": self.nome_plano,

            "valor_mensal": (
                float(self.valor_mensal)
                if self.valor_mensal is not None
                else None
            ),

            "dia_cobranca": self.dia_cobranca,

            "status_plano": self.status_plano,

            "tipo_cobranca": self.tipo_cobranca,

            "data_inicio": (
                self.data_inicio.isoformat()
                if self.data_inicio
                else None
            ),

            "proximo_vencimento": (
                self.proximo_vencimento.isoformat()
                if self.proximo_vencimento
                else None
            ),

            "forma_pagamento": self.forma_pagamento,

            "data_cancelamento": (
                self.data_cancelamento.isoformat()
                if self.data_cancelamento
                else None
            ),

            "motivo_cancelamento": self.motivo_cancelamento,

            "observacoes": self.observacoes,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


# ============================================================
# 6. INTERAÇÕES
# ============================================================
#
# Cada interação pertence a EXATAMENTE UM lead OU UM cliente
# (garantido pela rota e pelo CHECK interacoes_um_vinculo_chk).

class Interacao(db.Model):
    __tablename__ = "interacoes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    lead_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "leads_prospeccao.id",
            ondelete="CASCADE"
        )
    )

    cliente_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "clientes.id",
            ondelete="CASCADE"
        )
    )

    responsavel = db.Column(
        db.String(255)
    )

    tipo_interacao = db.Column(
        db.String(100)
    )

    data_interacao = db.Column(
        db.DateTime,
        nullable=False
    )

    resultado = db.Column(
        db.String(150)
    )

    proxima_acao = db.Column(
        db.String(150)
    )

    data_proxima_acao = db.Column(
        db.Date
    )

    descricao = db.Column(
        db.Text
    )

    # Mantido para compatibilidade com a estrutura anterior
    resumo = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now()
    )

    # --------------------------------------------------------
    # Relacionamentos
    # --------------------------------------------------------

    cliente = db.relationship(
        "Cliente",
        back_populates="interacoes"
    )

    lead = db.relationship(
        "Lead",
        back_populates="interacoes"
    )

    # --------------------------------------------------------
    # SERIALIZAÇÃO
    # --------------------------------------------------------

    def to_dict(self):
        return {
            "id": self.id,

            "lead_id": self.lead_id,
            "cliente_id": self.cliente_id,

            "lead_nome": (
                self.lead.nome_empresa
                if self.lead
                else None
            ),

            "cliente_nome": (
                self.cliente.nome_empresa
                if self.cliente
                else None
            ),

            "responsavel": self.responsavel,

            "tipo_interacao": self.tipo_interacao,

            "data_interacao": (
                self.data_interacao.isoformat()
                if self.data_interacao
                else None
            ),

            "resultado": self.resultado,

            "proxima_acao": self.proxima_acao,

            "data_proxima_acao": (
                self.data_proxima_acao.isoformat()
                if self.data_proxima_acao
                else None
            ),

            "descricao": self.descricao,

            "resumo": self.resumo,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }


# ============================================================
# 7. SCRIPTS COMERCIAIS
# ============================================================

class Script(db.Model):
    __tablename__ = "scripts"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    titulo = db.Column(
        db.String(255),
        nullable=False
    )

    categoria = db.Column(
        db.String(100),
        nullable=False
    )

    situacao = db.Column(
        db.String(150)
    )

    canal = db.Column(
        db.String(50)
    )

    script = db.Column(
        db.Text,
        nullable=False
    )

    status = db.Column(
        db.String(50),
        default="Ativo"
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now()
    )

    # --------------------------------------------------------
    # SERIALIZAÇÃO
    # --------------------------------------------------------

    def to_dict(self):
        return {
            "id": self.id,

            "titulo": self.titulo,
            "categoria": self.categoria,
            "situacao": self.situacao,
            "canal": self.canal,
            "script": self.script,
            "status": self.status,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }