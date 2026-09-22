CRIAÇÃO DO BANCO DE DADOS SUPABASE

```sql
-- ============================================================
-- 1. LEADS - PROSPECÇÃO
-- ============================================================

CREATE TABLE leads_prospeccao (
    id SERIAL PRIMARY KEY,

    -- Dados básicos
    nome_empresa VARCHAR(255) NOT NULL,
    nome_contato VARCHAR(255),
    telefone VARCHAR(50),
    email VARCHAR(255),
    cidade VARCHAR(255),
    ramo VARCHAR(255),
    ramo_personalizado VARCHAR(255),

    -- Presença digital
    presenca_digital TEXT[],
    site VARCHAR(100) DEFAULT 'Não',

    -- Primeiro contato
    abordado VARCHAR(20) DEFAULT 'Não',
    tipo_primeiro_contato VARCHAR(100),
    origem_lead VARCHAR(100),

    -- Comercial
    responsavel VARCHAR(255),
    status_lead VARCHAR(50) DEFAULT 'Novo',
    etapa_comercial VARCHAR(100) DEFAULT 'Novo Lead',
    nivel_interesse VARCHAR(50),
    potencial_valor VARCHAR(100),
    tipo_site VARCHAR(100),
    objetivo_site TEXT[],
    prazo_interesse VARCHAR(100),
    decisor VARCHAR(100),

    -- Próxima ação
    proxima_acao VARCHAR(150),
    data_proxima_acao DATE,
    horario_proxima_acao TIME,
    prioridade VARCHAR(50) DEFAULT 'Normal',

    -- Datas automáticas
    data_primeiro_contato DATE,
    data_ultimo_contato DATE,
    data_conversao DATE,

    -- Perda
    motivo_perda VARCHAR(150),
    motivo_perda_personalizado TEXT,

    -- Observações
    observacoes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. CLIENTES
-- ============================================================

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,

    nome_empresa VARCHAR(255) NOT NULL,
    nome_contato VARCHAR(255),
    telefone VARCHAR(50),
    email VARCHAR(255),
    cidade VARCHAR(255),
    ramo VARCHAR(255),
    link_site VARCHAR(500),

    status_cliente VARCHAR(50) DEFAULT 'Ativo',
    tipo_cliente VARCHAR(100),
    origem_cliente VARCHAR(100),

    data_conversao DATE,
    valor_medio NUMERIC(10, 2),

    ultimo_contato DATE,
    proximo_contato DATE,

    motivo_inativacao VARCHAR(150),

    -- Lead de origem (1 lead -> no máximo 1 cliente).
    -- UNIQUE garante o "no máximo 1" no lado do banco.
    lead_id INTEGER UNIQUE
        REFERENCES leads_prospeccao(id),

    observacoes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. PROJETOS
-- ============================================================

CREATE TABLE projetos (
    id SERIAL PRIMARY KEY,

    cliente_id INTEGER NOT NULL
        REFERENCES clientes(id),

    nome_projeto VARCHAR(255) NOT NULL,
    tipo_projeto VARCHAR(100),
    plano VARCHAR(100),

    status_projeto VARCHAR(100) DEFAULT 'Briefing',
    responsavel VARCHAR(255),
    prioridade VARCHAR(50) DEFAULT 'Normal',

    data_inicio DATE,
    data_previsao DATE,
    data_entrega DATE,

    valor_projeto NUMERIC(10, 2),

    link_projeto TEXT,
    repositorio TEXT,
    dominio TEXT,

    observacoes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. PAGAMENTOS
-- ============================================================

CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,

    cliente_id INTEGER NOT NULL
        REFERENCES clientes(id),

    projeto_id INTEGER
        REFERENCES projetos(id),

    valor NUMERIC(10, 2) NOT NULL,
    tipo_pagamento VARCHAR(100),

    numero_parcela INTEGER,
    total_parcelas INTEGER,

    data_vencimento DATE,
    data_pagamento DATE,

    status_pagamento VARCHAR(50) DEFAULT 'Pendente',
    forma_pagamento VARCHAR(100),

    observacoes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. PLANOS RECORRENTES
-- ============================================================

CREATE TABLE planos_recorrentes (
    id SERIAL PRIMARY KEY,

    cliente_id INTEGER NOT NULL
        REFERENCES clientes(id),

    nome_plano VARCHAR(100),
    valor_mensal NUMERIC(10, 2),
    dia_cobranca INTEGER,

    status_plano VARCHAR(50) DEFAULT 'Ativo',
    tipo_cobranca VARCHAR(100),

    data_inicio DATE,
    proximo_vencimento DATE,

    forma_pagamento VARCHAR(100),

    data_cancelamento DATE,
    motivo_cancelamento VARCHAR(150),

    observacoes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. INTERAÇÕES
-- ============================================================
-- Cada interação pertence a EXATAMENTE um lead OU um cliente,
-- nunca os dois, nunca nenhum (CHECK abaixo garante isso).
-- ON DELETE CASCADE: ao excluir o lead/cliente, o banco apaga
-- as interações vinculadas automaticamente (bate com o
-- passive_deletes=True do SQLAlchemy no models.py).

CREATE TABLE interacoes (
    id SERIAL PRIMARY KEY,

    lead_id INTEGER
        REFERENCES leads_prospeccao(id) ON DELETE CASCADE,

    cliente_id INTEGER
        REFERENCES clientes(id) ON DELETE CASCADE,

    responsavel VARCHAR(255),
    tipo_interacao VARCHAR(100),

    data_interacao TIMESTAMP NOT NULL,

    resultado VARCHAR(150),

    proxima_acao VARCHAR(150),
    data_proxima_acao DATE,

    descricao TEXT,
    resumo TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT interacoes_um_vinculo_chk CHECK (
        (lead_id IS NOT NULL AND cliente_id IS NULL)
        OR
        (lead_id IS NULL AND cliente_id IS NOT NULL)
    )
);


-- ============================================================
-- 7. SCRIPTS COMERCIAIS
-- ============================================================

CREATE TABLE scripts (
    id SERIAL PRIMARY KEY,

    titulo VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    situacao VARCHAR(150),
    canal VARCHAR(50),
    script TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Ativo',

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- ÍNDICES ÚTEIS (opcional, mas recomendado)
-- ============================================================
-- Acelera buscas e joins nas colunas de FK mais usadas.

CREATE INDEX idx_clientes_lead_id ON clientes(lead_id);
CREATE INDEX idx_projetos_cliente_id ON projetos(cliente_id);
CREATE INDEX idx_pagamentos_cliente_id ON pagamentos(cliente_id);
CREATE INDEX idx_pagamentos_projeto_id ON pagamentos(projeto_id);
CREATE INDEX idx_planos_cliente_id ON planos_recorrentes(cliente_id);
CREATE INDEX idx_interacoes_lead_id ON interacoes(lead_id);
CREATE INDEX idx_interacoes_cliente_id ON interacoes(cliente_id);
```



INSERÇÃO DE DADOS NO BANCO DE DADOS
```sql
INSERT INTO leads_prospeccao
(
    nome_empresa,
    nome_contato,
    telefone,
    email,
    cidade,
    ramo,
    abordado,
    site,
    status_lead,
    nivel_interesse,
    responsavel,
    created_at
)
VALUES
('Santuário Pet', NULL, '24999358779', NULL, 'Três Rios - RJ', 'PetShop', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Condessa Auto Peças', 'Teste', '2422552666', NULL, 'Três Rios - RJ', 'Auto Peças', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Parada do Contra Filé', NULL, '20294900', NULL, 'Três Rios - RJ', 'Restaurante', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Maju Veículos', NULL, '24992239864', NULL, 'Três Rios - RJ', 'Venda de Veículos', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Marrones Pet', NULL, '2422526081 / 24988653941 / 24988650919', NULL, 'Três Rios - RJ', 'PetShop', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Casa de Todos os Santos', NULL, '22553935 / 22553933', NULL, 'Três Rios - RJ', 'Artigos Religiosos', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Studio Isabelita Reinaldo', NULL, '24988025571', NULL, 'Três Rios - RJ', 'Cabelereira', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('MedPet', NULL, '24988133321', NULL, 'Três Rios - RJ', 'PetShop', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Orizzonte Construtora', NULL, '24992782235', NULL, 'Três Rios - RJ', 'Construtora', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('VetHouse', NULL, '24992284858', NULL, 'Três Rios - RJ', 'Clínica Veterinária', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('4 Patas', NULL, '2422554777', NULL, 'Três Rios - RJ', 'PetShop', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('MedBama', NULL, '2422551913', NULL, 'Três Rios - RJ', 'Produtos de Medicina', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('G9 Óptica', NULL, '24988559787', NULL, 'Três Rios - RJ', 'Ótica', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Mirella Calçados', NULL, '24988291065', NULL, 'Três Rios - RJ', 'Sapataria', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Nova Perfumaria', NULL, '24998775003', NULL, 'Três Rios - RJ', 'Perfumaria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Dolce Bananas', NULL, '2420308993', NULL, 'Três Rios - RJ', 'Doces', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Super Nova', NULL, '24993257024', NULL, 'Três Rios - RJ', 'Closet', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Farma Bio', NULL, '2420291531', NULL, 'Três Rios - RJ', 'Farmácia', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Parada Certa', NULL, '24988585047', NULL, 'Três Rios - RJ', 'Lanchonete', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Alô Mamãe', NULL, '22981541602', NULL, 'Três Rios - RJ', 'Restaurante e Lanchonete', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Mercadão do pé', NULL, '24988000412', NULL, 'Três Rios - RJ', 'Sapataria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Naturallyte', NULL, '2430310468', NULL, 'Três Rios - RJ', 'Produtos Naturais', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('PromoCell', NULL, '24992430570', NULL, 'Três Rios - RJ', 'Venda de Celular', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Clamon Grill', NULL, NULL, NULL, 'Três Rios - RJ', 'Restaurante', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Mais Economica', NULL, '999657763 / 22521080 / 22523832', NULL, 'Três Rios - RJ', 'Drogaria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Lavisul', NULL, '24998789983', NULL, 'Três Rios - RJ', 'Empréstimo', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Xuxa Cell', NULL, '24981422330', NULL, 'Três Rios - RJ', 'Assistência Técnica', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Estudio Black Bird Tattoo', NULL, NULL, NULL, 'Três Rios - RJ', 'Estudio de Tatuagem e Piercing', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Loja Doce', NULL, '24978353485', NULL, 'Três Rios - RJ', 'Loja de Doces', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Chique Chinellus', NULL, '24992075697', NULL, 'Três Rios - RJ', 'Chinelos', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Casa do Fazendeiro', NULL, '24988351003', NULL, 'Três Rios - RJ', 'PetShop', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Drogarias Brasileiras', NULL, '24992912249', NULL, 'Três Rios - RJ', 'Drogaria', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Gata Biju', NULL, '988595956', NULL, 'Três Rios - RJ', 'Moda Feminina', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Okulary', NULL, '988559785', NULL, 'Três Rios - RJ', 'Ótica', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Preço Baixo', NULL, '24981686846', NULL, 'Três Rios - RJ', 'Drogaria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Mirra', NULL, '24981288195', NULL, 'Três Rios - RJ', 'Moda Infantil', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Em cena', NULL, NULL, NULL, 'Três Rios - RJ', 'Boutique', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Artepao', NULL, NULL, NULL, 'Três Rios - RJ', 'Padaria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Delicias da Tia Zena', NULL, '22552483', NULL, 'Três Rios - RJ', 'Lanchonete', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Andréa Serpa', NULL, '2498869989', NULL, 'Três Rios - RJ', 'Roupas', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Azilena', NULL, '24998513547', NULL, 'Três Rios - RJ', 'Drogaria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Formularis', NULL, '24992675396', NULL, 'Três Rios - RJ', 'Manipulação de Remédio', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Six Girl', NULL, '2420292973', NULL, 'Três Rios - RJ', 'Moda Feminina', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Biba Calçados', NULL, NULL, NULL, 'Três Rios - RJ', 'Sapataria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Bahall Calçados', NULL, NULL, NULL, 'Três Rios - RJ', 'Sapataria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('M1 Mabis', NULL, NULL, NULL, 'Três Rios - RJ', 'Roupa', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Cell Rios', NULL, '24993061621', NULL, 'Três Rios - RJ', 'Concerto de Celulares', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Cia do Celular', NULL, '24998711206', NULL, 'Três Rios - RJ', 'Concerto de Celulares', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Maria Chica Biju', NULL, '32998054168', NULL, 'Três Rios - RJ', 'Bijuteria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Casa do Biscoito', NULL, '21984607994', NULL, 'Três Rios - RJ', 'Biscoito', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('MFashion', NULL, '2422521336', NULL, 'Três Rios - RJ', 'Roupas', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Tianastacia', NULL, '2422523016', NULL, 'Três Rios - RJ', 'Doces', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Versátil Modas', NULL, '24998347087', NULL, 'Três Rios - RJ', 'Roupas', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Zigal Bijuteria', NULL, '22513269', NULL, 'Três Rios - RJ', 'Bijuteria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Laboratório Tinoco', NULL, '24988570931', NULL, 'Três Rios - RJ', 'Laboratório', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('LabLife', NULL, '22526033', NULL, 'Três Rios - RJ', 'Laboratório', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('OniSolar', NULL, '1139580050', NULL, 'Três Rios - RJ', 'Painel Solar', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Princesa dos Parafusos', NULL, '24988250280', NULL, 'Três Rios - RJ', 'Produtos para Construção Civil', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Só Tintas', NULL, '2127435671', NULL, 'Três Rios - RJ', 'Tintas', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Paulistana', NULL, NULL, NULL, 'Três Rios - RJ', 'Cama Mesa e Banho', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('VipdeCor', NULL, NULL, NULL, 'Três Rios - RJ', 'Móveis', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Drogaria Econômica', NULL, '2422521490', NULL, 'Três Rios - RJ', 'Drogaria', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Casa Feliz', NULL, '24999322641', NULL, 'Três Rios - RJ', 'Móveis', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Lojas Nova Casa', NULL, '24999322641', NULL, 'Três Rios - RJ', 'Móveis', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Sorridents', NULL, '22521063', NULL, 'Três Rios - RJ', 'Odontologia', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Mega Fran', NULL, '24988228607', NULL, 'Três Rios - RJ', 'Cama Mesa e Banho', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Varejão dos tecidos', NULL, '2420293925', NULL, 'Três Rios - RJ', 'Tecido', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Pressão Ferragens', NULL, '22522887 / 22522916', NULL, 'Três Rios - RJ', 'Ferragens', 'Não', 'Sim', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Dog&Gatão', NULL, '999138517', NULL, 'Três Rios - RJ', 'Rações', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Eletrovale', NULL, '24998526906', NULL, 'Três Rios - RJ', 'Material Elétrico', 'Não', 'Não', 'Novo', NULL, 'Gabriel', '2026-08-02 05:13:23.619645'),
('Speed Mob', NULL, '+55 19 99880-3006', NULL, 'Piracicaba', 'Autopropelidos', 'Não', 'Não', 'Novo', NULL, NULL, '2026-09-07 03:04:30.9512'),
('Liberty Motors', NULL, '+55 22 98810-8865', NULL, 'Cabo Frio', 'Autopropelidos', 'Não', 'Não', 'Novo', NULL, NULL, '2026-09-07 14:12:55.715014'),
('Orla Scooter', NULL, '+55 21 96778-5726', NULL, 'Maricá', 'Autopropelidos', 'Não', 'Sim', 'Novo', NULL, NULL, '2026-09-07 18:29:45.684536'),
('WeVolts', NULL, '+55 21 98049-7225', NULL, 'Guapimirim', 'Autopropelidos', 'Não', 'Não', 'Novo', NULL, NULL, '2026-09-08 11:38:19.119487'),
('Winner Vendas Brasil', NULL, '+55 18 98805-9952', NULL, NULL, 'Vendas', 'Não', 'Não', 'Novo', NULL, NULL, '2026-09-08 12:19:31.926159');
```