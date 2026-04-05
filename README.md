# Party Planner

Aplicativo mobile para planejamento de festas com foco inicial em Android e base
reutilizavel para iOS.

## Estrutura

- `App mobile`: Expo + React Native + TypeScript
- `Backend separado`: `C:\Users\luizd\Documentos\Github\partyPlanner-backend`
- `WebApi do backend`: `C:\Users\luizd\Documentos\Github\partyPlanner-backend\src\PartyPlanner.WebApi`

## Etapas do produto

1. Base mobile reutilizavel
2. Gestao local de festas, tarefas, convidados e valores
3. Integracao com backend .NET separado
4. Autenticacao, compartilhamento e deploy

## O que ja foi implementado

- Dashboard mobile com selecao de festas
- Leitura real das festas via API
- Criacao de festa, tarefa, convidado e despesa via backend
- Toggle de tarefa integrado com o backend
- URL da API adaptada para ambiente local e backend publicado

## Como rodar o app mobile

```bash
npm.cmd run start
```

Depois:

- `a` para abrir no Android quando houver emulador aberto
- `w` para abrir na web
- `i` para iOS via simulador no macOS

## URL da API

Em desenvolvimento, por padrao o app usa:

- Android/iPhone na mesma rede: `http://192.168.3.70:5112`
- Web no computador: `http://localhost:5112`

Em producao, o app espera a URL publica configurada em `EXPO_PUBLIC_API_URL`,
por exemplo `https://partyplanner-backend-efxs.onrender.com`.
O arquivo [.env.example](C:/Users/luizd/Documentos/Github/partyPlanner/.env.example) mostra o formato esperado.

Para sobrescrever localmente:

```bash
$env:EXPO_PUBLIC_API_URL="https://SUA-API-PUBLICA"
npm.cmd run start
```

## Proxima etapa recomendada

Publicar o backend PostgreSQL e gerar um novo APK apontando para a API publica.
