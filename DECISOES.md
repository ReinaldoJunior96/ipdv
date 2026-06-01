# Decisões Técnicas

## Modelagem do banco

O banco foi modelado em duas camadas: uma camada de entrada/staging, responsável por armazenar os dados importados do CSV com rastreabilidade, e uma camada final normalizada, responsável por representar as entidades consolidadas.

- uma camada de entrada bruta, com `importacoes` e `staging_postos`
- uma camada final normalizada, com `bandeiras`, `responsaveis`, `postos`, `combustiveis` e `posto_combustiveis`

### Por que essa abordagem

`staging_postos` existe para receber o conteúdo do CSV já processado, mantendo rastreabilidade por importação e por linha. Isso ajuda a:

- auditar o que foi recebido
- manter erros de validação por linha
- permitir reprocessamento futuro
- separar entrada bruta de persistência final

Na camada final:

- `postos` é a entidade central
- `bandeiras` foi separada para evitar repetição textual
- `responsaveis` foi separada para evitar duplicidade por CPF
- `combustiveis` foi modelada como relação N:N com `postos`

Os campos de endereço foram mantidos diretamente em `postos` para reduzir complexidade de joins.

## Importação, validação e duplicidades

### Importação

O fluxo de importação foi dividido em duas etapas:

1. preview e pré-validação
2. importação definitiva

O frontend faz uma validação inicial para melhorar a UX. O backend recebe o arquivo original e refaz o parsing e a validação antes de persistir, sem confiar no cliente.

### Validação

A validação foi tratada em duas camadas:

- frontend: feedback rápido, preview e sinalização visual
- backend: validação autoritativa antes de gravar no banco

No backend, são validados:

- presença de cabeçalho esperado
- campos obrigatórios
- tamanho e formato básico de `cnpj`, `cpf_responsavel`, `cep` e `uf`
- formato básico de email
- campos numéricos
- normalização de espaços, maiúsculas/minúsculas e documentos

Também foi incluído tratamento de notação científica em documentos, comum em CSVs exportados de planilhas.

### Duplicidades

A importação foi pensada para ser idempotente no nível principal do domínio:

- `postos` usa `cnpj` como chave única
- `responsaveis` usa `cpf`
- `bandeiras` usa `nome`
- `combustiveis` usa `nome`

Na prática, isso significa que uma nova importação do mesmo arquivo não gera duplicação cega. Em vez disso, os dados existentes são atualizados com `ON CONFLICT ... DO UPDATE`.

## Exportação

A exportação foi pensada para gerar um CSV compatível com nova importação, respeitando:

- mesmas colunas
- mesma ordem
- dados compatíveis com o formato de entrada

Foi usada exportação por streaming com `COPY ... TO STDOUT` do PostgreSQL. A escolha foi feita para evitar soluções frágeis em memória e acomodar volumes maiores com menos custo no Node.

Também foi mantido o delimitador `;`, que é comum em exportações de planilhas em ambientes locais e reduz conflito com o campo `combustiveis`, que usa vírgula internamente.

## Trade-offs assumidos

### 1. Validação não totalmente espelhada entre frontend e backend

O frontend não replica todas as regras do backend. Isso foi um trade-off consciente:

- o frontend foi usado para pré-validação e UX
- o backend ficou responsável pela validação definitiva

Isso reduz acoplamento inicial e mantém a regra crítica do lado seguro da aplicação.

### 2. Endereço embutido em `postos`

Foi escolhida uma modelagem menos normalizada para o endereço. Separar `enderecos` seria possível, mas aumentaria joins e complexidade sem ganho claro para o escopo atual.

### 3. Uso de handlers e serviços simples

A aplicação não foi estruturada com uma arquitetura mais extensa de módulos, casos de uso e repositórios. Foi mantida uma organização simples, suficiente para:

- separar parsing
- separar importação
- separar listagem
- separar exportação

### 4. Limpeza total do domínio

A ação de limpar dados foi implementada com `TRUNCATE` das tabelas do domínio/importação.

## O que faria diferente com mais tempo

- criaria um middleware global de tratamento de erros com formato padronizado de resposta
- unificaria melhor as regras de validação entre frontend e backend
- adicionaria listagem paginada e filtros no backend
- melhoraria a segurança da exportação contra CSV injection
- adicionaria observabilidade melhor do processo de importação, com logs e métricas por importação
- adicionaria histórico detalhado de importações na interface
- refinaria a UI com confirmação em modal Vuetify para ações destrutivas

