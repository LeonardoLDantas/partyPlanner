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
- URL da API adaptada para Android emulator e web

## Como rodar o app mobile

```bash
npm.cmd run start
```

Depois:

- `a` para abrir no Android quando houver emulador aberto
- `w` para abrir na web
- `i` para iOS via simulador no macOS

## URL da API

Por padrao o app usa:

- Android emulator: `http://10.0.2.2:5112`
- Web e iOS simulator: `http://localhost:5112`

Para sobrescrever:

```bash
$env:EXPO_PUBLIC_API_URL="http://SEU-IP:5112"
npm.cmd run start
```

## Proxima etapa recomendada

Executar o backend novo com a `WebApi` em `src` e aplicar as migrations no SQL
Server Docker.
