backend:
Passo 1 — criar o ambiente virtual

Execute:

python -m venv venv

Se não aparecer nenhum erro, execute no terminal do PowerShell em C:\Users\GABRIEL\Desktop\ANTIGRAVITY\CRM SUPABASE\CRM>:

.\venv\Scripts\Activate.ps1

O início da linha deve mudar para algo assim:

(venv) C:\Users\GABRIEL\Desktop\ANTIGRAVITY\CRM SUPABASE\CRM>
Passo 2 — instalar as dependências

Com (venv) aparecendo:

pip install -r requirements.txt

Seu requirements.txt tem poucas dependências, então deve ser rápido.

Passo 3 — verificar se o Flask consegue carregar

Execute:

python -c "from backend.app import app; print(app)"

O esperado é algo parecido com:

<Flask 'backend.app'>
Passo 4 — iniciar o backend

Se o teste acima funcionar:

python -m flask --app backend.app run --port 8000

Você deverá ver algo parecido com:

* Serving Flask app 'backend.app'
* Running on http://127.0.0.1:8000

Aí abra no navegador:

http://localhost:8000/

E deve aparecer:

{
  "message": "API do CRM online",
  "status": "Funcionando"
}





FRONTEND:
Basta alterar frontend .env.local de:

NEXT_PUBLIC_API_URL=/api para NEXT_PUBLIC_API_URL=http://localhost:8000
