[🇬🇧 English](./README.en.md) | [🇧🇷 Português](./README.md) | [🇳🇱 Nederlands](./README.nl.md)

---

# 🤖 Telegram Claude Code Bot

Controle completo do Claude Code via Telegram com suporte a **texto**, **imagens** (visão) e **áudio** (transcrição automática)!

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Claude_Code-Stream_JSON-blue.svg" alt="Claude Code">
  <img src="https://img.shields.io/badge/Telegram-Bot_API-blue.svg" alt="Telegram">
  <img src="https://img.shields.io/badge/OpenAI-Whisper-orange.svg" alt="Whisper">
</p>

## ✨ Funcionalidades

### 💬 **Interação Completa**
- 🔄 **Streaming em tempo real** - Veja Claude pensando e respondendo
- 🧠 **Contexto persistente** - Sessões mantêm histórico completo
- ⚡ **Mensagens parciais** - Atualizações progressivas conforme Claude processa
- 🛠️ **Notificações de ferramentas** - Veja quando Claude executa comandos

### 📸 **Suporte Multimídia**
- 🖼️ **Análise de imagens** - Envie fotos e Claude analisa com visão
- 🎤 **Transcrição de áudio** - Envie mensagens de voz, transcritas automaticamente via Whisper
- 📁 **Arquivos locais** - Claude pode ler/escrever no diretório de trabalho

### 🌍 **Suporte Multilíngue**
- 🇬🇧 **Inglês** - Idioma padrão
- 🇧🇷 **Português** - Suporte completo
- 🇳🇱 **Holandês** - Suporte completo
- 🔄 **Troca de idioma** - Use `/lang` para mudar entre idiomas
- 🎙️ **Transcrição em qualquer idioma** - Whisper detecta automaticamente o idioma selecionado

### 🔒 **Segurança**
- 🔐 **Autenticação por Chat ID** - Apenas você pode usar o bot
- ✅ **Aprovação de permissões** - Controle total sobre ações do Claude
- 🚫 **Auto-skip opcional** - Modo `--dangerously-skip-permissions`

### 👥 **Suporte a Grupos**
- 🗣️ **Sessão compartilhada** - Use Claude Code em grupos do Telegram
- 👥 **Colaboração** - Todos os membros podem interagir com Claude
- 📝 **Histórico único** - Uma conversa compartilhada por grupo
- 📖 **[Ver guia completo](GROUPS.pt.md)** - Instruções detalhadas de configuração

---

## 🚀 Instalação

### 1️⃣ Pré-requisitos

- **Node.js 18+** ([Baixar](https://nodejs.org))
- **Claude Code CLI** instalado e configurado ([Docs](https://docs.claude.com/en/docs/claude-code))
- **Conta Telegram**

### 2️⃣ Clone e Instale

```bash
git clone https://github.com/seu-usuario/telegram-claude-bot.git
cd telegram-claude-bot
npm install
```

### 3️⃣ Configure o `.env`

Crie um arquivo `.env` na raiz do projeto:

```env
# ============================================
# OBRIGATÓRIO
# ============================================

# Token do bot do Telegram (obtenha com @BotFather)
TELEGRAM_BOT_TOKEN=seu_token_aqui

# ============================================
# RECOMENDADO
# ============================================

# ID do chat autorizado (seu Chat ID do Telegram)
# Pode ser um único ID ou múltiplos (chat privado + grupos) separados por vírgula
# Exemplo: AUTHORIZED_CHAT_ID=123456789,-987654321
AUTHORIZED_CHAT_ID=seu_chat_id_aqui

# Diretório de trabalho do Claude Code
WORKING_DIR=C:\seu\projeto

# Caminho para o executável do Claude Code
CLAUDE_CODE_PATH=claude

# ============================================
# OPCIONAL - Transcrição de áudio
# ============================================

# API Key do OpenAI (para Whisper - transcrição de áudio)
OPENAI_API_KEY=sk-proj-...sua_key_aqui...

# ============================================
# OPCIONAL - Idioma / Language
# ============================================

# Idioma padrão para novos usuários
# Default language for new users (en, pt, ou nl)
DEFAULT_LANGUAGE=en
```

#### 🔑 Como obter o **Token do Bot**:

1. Abra [@BotFather](https://t.me/botfather) no Telegram
2. Envie `/newbot`
3. Escolha um nome e username para seu bot
4. Copie o token fornecido

#### 🆔 Como obter seu **Chat ID**:

1. Inicie o bot **sem** configurar `AUTHORIZED_CHAT_ID`
2. Envie `/start` para o bot
3. Veja no console do servidor: `📱 Seu Chat ID: 123456789`
4. Adicione ao `.env`

#### 🎙️ Como obter **OpenAI API Key** (opcional):

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta e vá em **API Keys**
3. Gere uma nova chave
4. Adicione ao `.env`

> **⚠️ IMPORTANTE:** Nunca commite o arquivo `.env`! Ele contém informações sensíveis.

### 4️⃣ Execute

```bash
npm start
```

ou para desenvolvimento com auto-reload:

```bash
npm run dev
```

---

## 📱 Como Usar

### Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `/start` | Inicia uma nova sessão Claude Code |
| `/stop` | Encerra a sessão atual |
| `/status` | Mostra status da sessão (PID, Session ID, etc.) |
| `/help` | Exibe ajuda e funcionalidades |
| `/lang` | Muda o idioma da interface (en, pt, nl) |
| `/lang en` | Muda para Inglês |
| `/lang pt` | Muda para Português |
| `/lang nl` | Muda para Holandês |

### Comandos Avançados

O bot agora suporta comandos avançados do Claude Code CLI!

#### Execução Direta do CLI
```bash
/command <flags> <prompt>
/command --help                    # Ver todas as opções do Claude CLI
/command --model opus "Escrever um poema"
/command --tools Bash,Read "Listar arquivos"
/command /review-pr 123            # Executar comando personalizado
```

#### Atalhos Rápidos

**Trocar Modelo:**
```bash
/model                    # Ver modelo atual
/model sonnet            # Usar Claude Sonnet
/model opus              # Usar Claude Opus
/model haiku             # Usar Claude Haiku
```

**Retomar Conversas:**
```bash
/resume <session-id>     # Retomar sessão específica
/continue                # Continuar conversa mais recente
```

**Gerenciar Ferramentas:**
```bash
/tools                   # Listar ferramentas disponíveis
/tools list              # Listar ferramentas disponíveis
/tools enable Bash,Read  # Habilitar apenas ferramentas específicas
/tools disable Write     # Desabilitar ferramentas específicas
```

**Controlar Permissões:**
```bash
/permissions             # Ver modo atual
/permissions strict      # Pedir aprovação para tudo
/permissions relaxed     # Auto-aprovar leituras
/permissions skip        # Auto-aprovar tudo (padrão)
```

#### Comandos Personalizados

O bot automaticamente descobre comandos personalizados em `.claude/commands/`:
```bash
/command /review-pr 123
/command /fix-bug "Descrição do bug"
/command /optimize main.js
```

### 🌐 Seleção de Idioma

O bot suporta **3 idiomas** para toda a interface e mensagens:

**Idioma Padrão**: Inglês (English)

Para **mudar de idioma**, use o comando `/lang`:

```
/lang              # Mostra idioma atual e opções disponíveis
/lang en           # Muda para Inglês (English) 🇬🇧
/lang pt           # Muda para Português 🇧🇷
/lang nl           # Muda para Holandês (Nederlands) 🇳🇱
```

A escolha é imediata e confirmada na tela. Todas as mensagens do bot serão exibidas no idioma selecionado, incluindo:
- Mensagens de status
- Mensagens de erro
- Feedback de processamento
- Transcrição de áudio (no idioma selecionado)

**Persistência / Persistence / Persistentie:**
- Suas preferências de idioma são salvas automaticamente
- Your language preferences are saved automatically
- Je taalvoorkeuren worden automatisch opgeslagen
- Armazenadas em `data/language-preferences.json`
- Stored in `data/language-preferences.json`
- Opgeslagen in `data/language-preferences.json`

### 💬 Interação por Texto

Simplesmente digite sua mensagem normalmente:

```
Você: Liste os arquivos do diretório atual

Claude: 🤖 Vou usar o comando Bash para listar...
        [streaming...]
        📁 Arquivos encontrados:
        - index.js
        - package.json
        - README.md
```

### 📸 Envio de Imagens

Envie uma foto diretamente no chat:

```
[Você envia uma screenshot de código]

Claude: 🤖 Vejo um código JavaScript que...
        - Define uma função assíncrona
        - Usa fetch para fazer requisições
        - Tem um try/catch para tratamento de erros

        Quer que eu sugira melhorias?
```

### 🎤 Mensagens de Voz

Grave e envie um áudio:

```
[Você envia áudio: "Claude, crie um servidor Express básico"]

Bot: 🎤 Áudio transcrito:
     "Claude, crie um servidor Express básico"

Claude: 🤖 Vou criar um servidor Express...
        [cria o código]
```

### ✅ Aprovação de Permissões

Quando Claude precisa de permissão, você recebe botões:

```
Claude: 🔐 PERMISSÃO NECESSÁRIA:
        Allow Claude to write file server.js?

        [✅ Permitir (Y)] [❌ Negar (N)]
```

Clique para aprovar ou negar.

---

## 🔧 Como Funciona

### Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Telegram   │─────▶│  Node.js Bot │─────▶│  Claude Code    │
│   Usuário   │◀─────│   (index.js) │◀─────│  (stream-json)  │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  OpenAI      │
                     │  Whisper API │
                     └──────────────┘
```

### Fluxo de Streaming

1. **Spawn Process** - Inicia `claude` com modo `--print --output-format stream-json`
2. **Session ID** - UUID gerado para manter contexto entre mensagens
3. **Stream Events** - Captura eventos JSON em tempo real:
   - `message_start` - Claude começou a responder
   - `content_block_delta` - Texto parcial chegando
   - `message_stop` - Resposta completa
   - `tool_use` - Claude executando ferramenta
4. **Debounce** - Agrupa texto em chunks para enviar ao Telegram
5. **Bidirectional** - Suas respostas vão direto para o stdin do Claude

### Formato de Mensagens (Stream JSON)

**Input (você → Claude):**
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "Sua mensagem aqui"
  },
  "session_id": "uuid-da-sessão",
  "parent_tool_use_id": null
}
```

**Output (Claude → você):**
```json
{
  "type": "stream_event",
  "event": {
    "type": "content_block_delta",
    "delta": {
      "type": "text_delta",
      "text": "Texto parcial..."
    }
  }
}
```

---

## 🛡️ Segurança e Boas Práticas

### ✅ Recomendações

- **Use `AUTHORIZED_CHAT_ID`** - Proteja seu bot de acessos não autorizados
- **Nunca commite `.env`** - Suas credenciais devem ficar locais
- **Revise permissões** - Aprove apenas ações que você confia
- **Monitore uso** - Acompanhe os logs do console

### ⚠️ Avisos Importantes

- O bot executa comandos no **seu sistema local**
- Claude pode **ler/escrever arquivos** no `WORKING_DIR`
- Transcrições de áudio são enviadas para a **API do OpenAI**
- Imagens são enviadas para a **API da Anthropic**

### 🔒 `.gitignore`

O arquivo `.gitignore` já está configurado para proteger:
```
node_modules/
temp/
*.log
.env
```

---

## 🐛 Troubleshooting

### Bot não responde

**Possíveis causas:**
- Token do Telegram incorreto
- Claude Code não está instalado
- Firewall bloqueando conexões

**Solução:**
```bash
# Verifique se Claude Code está instalado
claude --version

# Teste manualmente
claude --print --output-format text "Olá"

# Veja os logs do console
```

### "Acesso não autorizado"

**Causa:** Seu Chat ID não está no `.env`

**Solução:**
1. Remova `AUTHORIZED_CHAT_ID` temporariamente
2. Envie `/start` no bot
3. Veja seu Chat ID no console
4. Adicione ao `.env`

### Áudio não transcreve

**Causa:** `OPENAI_API_KEY` não configurada

**Solução:**
- Configure a chave da OpenAI no `.env`
- Reinicie o bot
- O bot mostrará: `✅ OpenAI Whisper habilitado`

### Imagens não funcionam

**Possíveis causas:**
- Arquivo muito grande (>10MB)
- Formato não suportado

**Formatos suportados:**
- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`

### Claude não mantém contexto

**Solução:**
```bash
# No Telegram:
/stop
/start

# O Session ID muda, resetando o contexto
```

---

## 📂 Estrutura do Projeto

```
telegram-claude-bot/
├── index.js              # Código principal do bot
├── package.json          # Dependências Node.js
├── .env                  # Configurações (criar manualmente)
├── .gitignore            # Arquivos ignorados pelo Git
├── README.md             # Esta documentação
└── temp/                 # Áudios temporários (auto-criado)
```

---

## 🔄 Atualizações e Contribuições

### Roadmap

- [ ] Suporte a documentos (PDF, DOCX)
- [ ] Suporte a múltiplas sessões simultâneas
- [ ] Interface web de gerenciamento
- [ ] Comandos personalizados
- [ ] Logs persistentes

### Como Contribuir

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona funcionalidade X'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

## 🙏 Créditos

- **Claude Code** - [Anthropic](https://www.anthropic.com)
- **Telegram Bot API** - [Telegram](https://core.telegram.org/bots)
- **OpenAI Whisper** - [OpenAI](https://openai.com/research/whisper)

---

## 💡 FAQ

### Quanto custa usar?

- **Telegram Bot**: Grátis
- **Claude Code**: Requer assinatura Claude Pro
- **OpenAI Whisper**: ~$0.006 por minuto de áudio

### Posso usar em produção?

Sim, mas adicione:
- Rate limiting
- Logs estruturados
- Health checks
- Deploy em servidor (não localhost)

### Funciona em que sistemas?

- ✅ Windows 10/11
- ✅ macOS (Intel e Apple Silicon)
- ✅ Linux (Ubuntu, Debian, etc.)

### Preciso deixar o PC ligado?

Sim, o bot roda localmente. Para rodar 24/7:
- Use um VPS (AWS, DigitalOcean, etc.)
- Configure PM2 para auto-restart
- Use systemd no Linux

---

<p align="center">
  Feito com ❤️ usando Claude Code
</p>
