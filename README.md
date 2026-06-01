# IPDV Web

Aplicação fullstack para importar postos de combustível via CSV, validar os dados, persistir no PostgreSQL, visualizar os registros cadastrados e exportar novamente em CSV compatível com nova importação.

## Stack

- Node.js 22+
- Backend: Express + `pg`
- Frontend: Vue 3 + Vuetify
- Banco: PostgreSQL
- Infra local: Docker Compose

## Funcionalidades atuais

- Upload de CSV com preview e validação no frontend
- Preview e validação autoritativa no backend
- Importação para o PostgreSQL
- Persistência em tabelas normalizadas
- Listagem dos postos cadastrados
- Exportação dos postos em CSV
- Limpeza dos dados cadastrados

## Requisitos

- Docker e Docker Compose

Opcional para rodar fora do Docker:

- Node.js 22 ou superior
- npm

## Como rodar com Docker

Suba os serviços:

```bash
docker compose up -d --build
```

Serviços disponíveis:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Migrations

As migrations estão em:

```text
backend/sql/migrations
```

Para aplicar as migrations no container do backend:

```bash
docker exec postos_backend npm run migrate
```

## Dependências no container

Se houver alteração em `package.json` e o container não reconhecer uma dependência nova, sincronize com:

```bash
docker exec postos_backend npm install
docker exec postos_frontend npm install
```

## Comandos úteis

### Backend

Rodar migrations:

```bash
docker exec postos_backend npm run migrate
```

Rodar testes:

```bash
docker exec postos_backend npm test
```

Build:

```bash
docker exec postos_backend npm run build
```

### Frontend

Build:

```bash
docker exec postos_frontend npm run build
```

## Fluxo principal

1. Selecionar um arquivo CSV no frontend
2. Visualizar o preview e as validações
3. Enviar o arquivo para cadastro no banco
4. Consultar os postos cadastrados
5. Exportar os dados em CSV

## Endpoints principais

- `GET /health`
- `POST /importacoes/postos/preview`
- `POST /importacoes/postos`
- `GET /postos`
- `GET /postos/exportar`
- `DELETE /postos`

## Observações importantes

- O frontend faz pré-validação para melhorar a experiência do usuário.
- O backend faz a validação definitiva antes da persistência.
- O sistema trata duplicidade por `cnpj` do posto, com atualização do registro existente.
- A exportação gera CSV com as mesmas colunas e mesma ordem do arquivo de importação.
- O banco pode ser limpo pela própria interface, usando a ação de limpar dados cadastrados.

## Testes

Os testes atuais cobrem:

- parsing e validação do CSV
- validação de campos obrigatórios
- notação científica em documentos
- comportamento do endpoint de preview

Para executar:

```bash
docker exec postos_backend npm test
```
