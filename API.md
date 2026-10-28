# API da Loja

## Objetivo

Esta API fornece o backend da loja e do seu sistema de gestão. Ela permite autenticar usuários e administrar produtos, categorias, clientes, fornecedores, funcionários, estoque, entradas e saídas de mercadorias, movimentações e pedidos. Os dados são armazenados em MySQL/MariaDB.

## Tecnologias

- Node.js com Express
- MySQL/MariaDB
- JSON para requisições e respostas

## Executar

Configure as variáveis de ambiente usadas pelo servidor e pelo banco:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
AUTH_TOKEN_SECRET=gere-um-segredo-aleatorio-com-pelo-menos-32-bytes
```

Mantenha os valores reais em um arquivo `.env` local e não o envie ao controle de versão. O segredo de autenticação é obrigatório e precisa ter pelo menos 32 bytes.

Instale as dependências e inicie o servidor:

```bash
npm install
npm start
```

Por padrão, a API fica disponível em `http://localhost:5000`.

## Formato das requisições

Envie e receba JSON. Para operações com corpo, use o cabeçalho:

```http
Content-Type: application/json
```

## Autenticação

### Login

`POST /usuario/login` é a rota pública de autenticação.

Requisição:

```json
{
  "email": "usuario@exemplo.com",
  "senha": "sua-senha"
}
```

Em caso de sucesso, a resposta inclui um token Bearer válido por uma hora e dados públicos do usuário:

```json
{
  "mensagem": "Login realizado com sucesso",
  "token": "<token>",
  "tipo": "Bearer",
  "expira_em": 3600,
  "usuario": {
    "id_usu": 1,
    "nome": "Nome do usuário",
    "email": "usuario@exemplo.com"
  }
}
```

Envie o token nas demais rotas protegidas:

```http
Authorization: Bearer <token>
```

Tokens ausentes, inválidos ou expirados recebem `401 Unauthorized`. A falta de configuração do segredo no servidor recebe `500`.

> O login verifica senhas armazenadas no formato `scrypt` criado pela rota de cadastro/atualização de usuários. Senhas antigas em texto puro ou em outros formatos não podem ser autenticadas por esta rota; redefina-as usando um processo seguro.

## Endpoints

Todas as rotas abaixo, exceto `POST /usuario/login` e `GET /teste`, exigem token Bearer.

### Usuários

Base: `/usuario`

| Método | Rota | Ação |
|---|---|---|
| POST | `/usuario/login` | Autentica o usuário e retorna token |
| GET | `/usuario` | Lista usuários sem retornar hashes de senha |
| GET | `/usuario/:id` | Consulta os dados públicos de um usuário |
| POST | `/usuario` | Cadastra usuário; recebe `nome`, `email`, `senha` e, opcionalmente, `contato`, `genero`, `ativo` |
| PATCH | `/usuario/:id` | Atualiza dados do usuário; uma nova `senha` é armazenada como hash |
| DELETE | `/usuario/:id` | Remove usuário |

O cadastro de usuário é protegido por autenticação, assim como as demais operações administrativas.

### Cadastros

As rotas de categorias, clientes, fornecedores e funcionários oferecem `GET /`, `GET /:id`, `POST /`, `PATCH /:id` e `DELETE /:id`.

| Recurso | Rotas base | Campos aceitos |
|---|---|---|
| Categorias | `/categorias` | `nome`, `descricao`, `ativo` |
| Clientes | `/clientes` | `nome`, `email`, `contato`, `ativo` |
| Fornecedores | `/fornecedores` | `nome`, `empresa`, `email`, `telefone`, `cidade`, `estado`, `ativo` |
| Funcionários | `/funcionarios` e `/funcionario/funcionarios` | `nome`, `cargo`, `salario`, `telefone`, `email`, `data_admissao`, `ativo` |

Para criar uma categoria, cliente, fornecedor ou funcionário, informe os campos obrigatórios: respectivamente `nome`; `nome` e `email`; `nome`; e `nome`, `cargo` e `salario`. No `PATCH`, envie apenas os campos que deseja alterar.

### Produtos

Base: `/produtos`

| Método | Rota | Ação |
|---|---|---|
| GET | `/produtos` | Lista produtos |
| GET | `/produtos/:id` | Consulta produto |
| POST | `/produtos` | Cadastra produto com `nome`, `descricao`, `preco`, `imagem_produto` e `id_categoria` |
| PATCH | `/produtos/:id` | Atualiza os campos do produto enviados |
| DELETE | `/produtos/:id` | Remove produto |
| GET | `/produtos/:id/historico-precos` | Lista histórico de preços do produto |

### Estoque e movimentação

| Método | Rota | Ação |
|---|---|---|
| GET | `/estoque` | Lista estoque com nome do produto |
| GET | `/estoque/:produtoId` | Consulta estoque de um produto |
| PATCH | `/estoque/:produtoId` | Atualiza `estoque_minimo`, `estoque_maximo` e/ou `localizacao` |
| GET | `/entradas` | Lista entradas de mercadorias |
| GET | `/entradas/:id` | Consulta uma entrada |
| POST | `/entradas` | Registra entrada com `id_produto`, `id_fornecedor`, `quantidade` e `valor_unitario`; `data_entrada` e `observacao` são opcionais |
| GET | `/saidas` | Lista saídas |
| GET | `/saidas/:id` | Consulta uma saída |
| POST | `/saidas` | Registra saída com `id_produto`, `id_funcionario`, `quantidade` e `valor_unitario`; `data_saida` e `destino` são opcionais |
| GET | `/movimentacoes` | Lista movimentações |
| GET | `/movimentacoes/:id` | Consulta uma movimentação |

Entradas e saídas exigem quantidade inteira positiva. A criação de uma saída verifica o estoque disponível e rejeita a operação se a quantidade for insuficiente.

### Pedidos

Base: `/pedidos`

| Método | Rota | Ação |
|---|---|---|
| GET | `/pedidos` | Lista pedidos com nome do cliente |
| GET | `/pedidos/:id` | Consulta pedido e seus itens |
| POST | `/pedidos` | Cria pedido e seus itens em uma transação |
| PATCH | `/pedidos/:id` | Atualiza `status`, `data_pedido` e/ou `id_cliente` |

Exemplo de criação:

```json
{
  "id_cliente": 1,
  "status": 1,
  "itens": [
    {
      "id_produto": 1,
      "quantidade": 2
    }
  ]
}
```

Cada item precisa de `id_produto` e `quantidade` inteira positiva. Se `valor_unitario` não for informado, é usado o preço atual do produto.

### Verificação do servidor

`GET /teste` é pública e retorna uma confirmação simples de que a API está respondendo.

## Respostas e erros

As rotas usam códigos HTTP, entre eles:

- `200 OK`: consulta ou atualização concluída.
- `201 Created`: registro criado.
- `202 Accepted`: remoção de produto aceita.
- `400 Bad Request`: dados obrigatórios ausentes ou inválidos.
- `401 Unauthorized`: token ausente, inválido ou expirado; ou credenciais de login inválidas.
- `404 Not Found`: recurso não encontrado.
- `409 Conflict`: estoque insuficiente para registrar uma saída.
- `500 Internal Server Error`: erro interno ou de banco de dados.

Os corpos de erro normalmente contêm uma propriedade `erro` com uma descrição.
