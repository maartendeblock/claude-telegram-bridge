[🇬🇧 English](./README.en.md) | [🇧🇷 Português](./README.md) | [🇳🇱 Nederlands](./README.nl.md)

---

# 🤖 Telegram Claude Code Bot

Complete control of Claude Code via Telegram with support for **text**, **images** (vision), and **audio** (automatic transcription)!

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Claude_Code-Stream_JSON-blue.svg" alt="Claude Code">
  <img src="https://img.shields.io/badge/Telegram-Bot_API-blue.svg" alt="Telegram">
  <img src="https://img.shields.io/badge/OpenAI-Whisper-orange.svg" alt="Whisper">
</p>

## ✨ Features

### 💬 **Complete Interaction**
- 🔄 **Real-time streaming** - Watch Claude thinking and responding
- 🧠 **Persistent context** - Sessions maintain complete history
- ⚡ **Partial messages** - Progressive updates as Claude processes
- 🛠️ **Tool notifications** - See when Claude executes commands

### 📸 **Multimedia Support**
- 🖼️ **Image analysis** - Send photos and Claude analyzes with vision
- 🎤 **Audio transcription** - Send voice messages, automatically transcribed via Whisper
- 📁 **Local files** - Claude can read/write in the working directory

### 🌍 **Multilingual Support**
- 🇬🇧 **English** - Default language
- 🇧🇷 **Portuguese** - Full support
- 🇳🇱 **Dutch** - Full support
- 🔄 **Language switching** - Use `/lang` to switch between languages
- 🎙️ **Transcription in any language** - Whisper automatically detects the selected language

### 🔒 **Security**
- 🔐 **Chat ID authentication** - Only you can use the bot
- ✅ **Permission approval** - Complete control over Claude's actions
- 🚫 **Optional auto-skip** - `--dangerously-skip-permissions` mode

### 👥 **Group Support**
- 🗣️ **Shared session** - Use Claude Code in Telegram groups
- 👥 **Collaboration** - All members can interact with Claude
- 📝 **Single history** - One shared conversation per group
- 📖 **[View complete guide](GROUPS.en.md)** - Detailed setup instructions

---

## 🚀 Installation

### 1️⃣ Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org))
- **Claude Code CLI** installed and configured ([Docs](https://docs.claude.com/en/docs/claude-code))
- **Telegram account**

### 2️⃣ Clone and Install

```bash
git clone https://github.com/your-username/telegram-claude-bot.git
cd telegram-claude-bot
npm install
```

### 3️⃣ Configure `.env`

Create a `.env` file in the project root:

```env
# ============================================
# REQUIRED
# ============================================

# Telegram bot token (obtain from @BotFather)
TELEGRAM_BOT_TOKEN=your_token_here

# ============================================
# RECOMMENDED
# ============================================

# Authorized chat ID (your Telegram Chat ID)
# Can be a single ID or multiple (private chat + groups) separated by comma
# Example: AUTHORIZED_CHAT_ID=123456789,-987654321
AUTHORIZED_CHAT_ID=your_chat_id_here

# Claude Code working directory
WORKING_DIR=C:\your\project

# Path to Claude Code executable
CLAUDE_CODE_PATH=claude

# ============================================
# OPTIONAL - Audio transcription
# ============================================

# OpenAI API Key (for Whisper - audio transcription)
OPENAI_API_KEY=sk-proj-...your_key_here...

# ============================================
# OPTIONAL - Language
# ============================================

# Default language for new users
# Default language for new users (en, pt, or nl)
DEFAULT_LANGUAGE=en
```

#### 🔑 How to get the **Bot Token**:

1. Open [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Choose a name and username for your bot
4. Copy the provided token

#### 🆔 How to get your **Chat ID**:

1. Start the bot **without** configuring `AUTHORIZED_CHAT_ID`
2. Send `/start` to the bot
3. Check the server console: `📱 Your Chat ID: 123456789`
4. Add it to `.env`

#### 🎙️ How to get **OpenAI API Key** (optional):

1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account and go to **API Keys**
3. Generate a new key
4. Add it to `.env`

> **⚠️ IMPORTANT:** Never commit the `.env` file! It contains sensitive information.

### 4️⃣ Run

```bash
npm start
```

or for development with auto-reload:

```bash
npm run dev
```

---

## 📱 How to Use

### Available Commands

| Command | Description |
|---------|-----------|
| `/start` | Start a new Claude Code session |
| `/stop` | End the current session |
| `/status` | Show session status (PID, Session ID, etc.) |
| `/help` | Display help and features |
| `/lang` | Change interface language (en, pt, nl) |
| `/lang en` | Switch to English |
| `/lang pt` | Switch to Portuguese |
| `/lang nl` | Switch to Dutch |

### Advanced Commands

The bot now supports advanced Claude Code CLI commands!

#### Direct CLI Execution
```bash
/command <flags> <prompt>
/command --help                    # View all Claude CLI options
/command --model opus "Write a poem"
/command --tools Bash,Read "List files"
/command /review-pr 123            # Execute custom command
```

#### Quick Shortcuts

**Switch Model:**
```bash
/model                    # View current model
/model sonnet            # Use Claude Sonnet
/model opus              # Use Claude Opus
/model haiku             # Use Claude Haiku
```

**Resume Conversations:**
```bash
/resume <session-id>     # Resume specific session
/continue                # Continue most recent conversation
```

**Manage Tools:**
```bash
/tools                   # List available tools
/tools list              # List available tools
/tools enable Bash,Read  # Enable only specific tools
/tools disable Write     # Disable specific tools
```

**Control Permissions:**
```bash
/permissions             # View current mode
/permissions strict      # Ask for every permission
/permissions relaxed     # Auto-approve reads
/permissions skip        # Auto-approve everything (default)
```

#### Custom Commands

The bot automatically discovers custom commands in `.claude/commands/`:
```bash
/command /review-pr 123
/command /fix-bug "Bug description"
/command /optimize main.js
```

### 🌐 Language Selection

The bot supports **3 languages** for the entire interface and messages:

**Default Language**: English

To **change language**, use the `/lang` command:

```
/lang              # Show current language and available options
/lang en           # Switch to English 🇬🇧
/lang pt           # Switch to Portuguese 🇧🇷
/lang nl           # Switch to Dutch (Nederlands) 🇳🇱
```

The change is immediate and confirmed on screen. All bot messages will be displayed in the selected language, including:
- Status messages
- Error messages
- Processing feedback
- Audio transcription (in the selected language)

**Persistência / Persistence / Persistentie:**
- Suas preferências de idioma são salvas automaticamente
- Your language preferences are saved automatically
- Je taalvoorkeuren worden automatisch opgeslagen
- Armazenadas em `data/language-preferences.json`
- Stored in `data/language-preferences.json`
- Opgeslagen in `data/language-preferences.json`

### 💬 Text Interaction

Simply type your message normally:

```
You: List the files in the current directory

Claude: 🤖 I'll use the Bash command to list...
        [streaming...]
        📁 Files found:
        - index.js
        - package.json
        - README.md
```

### 📸 Sending Images

Send a photo directly in the chat:

```
[You send a code screenshot]

Claude: 🤖 I see JavaScript code that...
        - Defines an async function
        - Uses fetch to make requests
        - Has a try/catch for error handling

        Would you like me to suggest improvements?
```

### 🎤 Voice Messages

Record and send audio:

```
[You send audio: "Claude, create a basic Express server"]

Bot: 🎤 Audio transcribed:
     "Claude, create a basic Express server"

Claude: 🤖 I'll create an Express server...
        [creates the code]
```

### ✅ Permission Approval

When Claude needs permission, you receive buttons:

```
Claude: 🔐 PERMISSION REQUIRED:
        Allow Claude to write file server.js?

        [✅ Allow (Y)] [❌ Deny (N)]
```

Click to approve or deny.

---

## 🔧 How It Works

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Telegram   │─────▶│  Node.js Bot │─────▶│  Claude Code    │
│    User     │◀─────│   (index.js) │◀─────│  (stream-json)  │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  OpenAI      │
                     │  Whisper API │
                     └──────────────┘
```

### Streaming Flow

1. **Spawn Process** - Starts `claude` with `--print --output-format stream-json` mode
2. **Session ID** - Generated UUID to maintain context between messages
3. **Stream Events** - Captures JSON events in real-time:
   - `message_start` - Claude started responding
   - `content_block_delta` - Partial text arriving
   - `message_stop` - Complete response
   - `tool_use` - Claude executing tool
4. **Debounce** - Groups text in chunks to send to Telegram
5. **Bidirectional** - Your responses go directly to Claude's stdin

### Message Format (Stream JSON)

**Input (you → Claude):**
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "Your message here"
  },
  "session_id": "session-uuid",
  "parent_tool_use_id": null
}
```

**Output (Claude → you):**
```json
{
  "type": "stream_event",
  "event": {
    "type": "content_block_delta",
    "delta": {
      "type": "text_delta",
      "text": "Partial text..."
    }
  }
}
```

---

## 🛡️ Security and Best Practices

### ✅ Recommendations

- **Use `AUTHORIZED_CHAT_ID`** - Protect your bot from unauthorized access
- **Never commit `.env`** - Your credentials should remain local
- **Review permissions** - Only approve actions you trust
- **Monitor usage** - Keep an eye on console logs

### ⚠️ Important Warnings

- The bot executes commands on **your local system**
- Claude can **read/write files** in the `WORKING_DIR`
- Audio transcriptions are sent to **OpenAI's API**
- Images are sent to **Anthropic's API**

### 🔒 `.gitignore`

The `.gitignore` file is already configured to protect:
```
node_modules/
temp/
*.log
.env
```

---

## 🐛 Troubleshooting

### Bot doesn't respond

**Possible causes:**
- Incorrect Telegram token
- Claude Code is not installed
- Firewall blocking connections

**Solution:**
```bash
# Check if Claude Code is installed
claude --version

# Test manually
claude --print --output-format text "Hello"

# Check console logs
```

### "Unauthorized access"

**Cause:** Your Chat ID is not in `.env`

**Solution:**
1. Temporarily remove `AUTHORIZED_CHAT_ID`
2. Send `/start` to the bot
3. Check your Chat ID in the console
4. Add it to `.env`

### Audio doesn't transcribe

**Cause:** `OPENAI_API_KEY` not configured

**Solution:**
- Configure OpenAI key in `.env`
- Restart the bot
- The bot will show: `✅ OpenAI Whisper enabled`

### Images don't work

**Possible causes:**
- File too large (>10MB)
- Unsupported format

**Supported formats:**
- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`

### Claude doesn't maintain context

**Solution:**
```bash
# In Telegram:
/stop
/start

# The Session ID changes, resetting the context
```

---

## 📂 Project Structure

```
telegram-claude-bot/
├── index.js              # Main bot code
├── package.json          # Node.js dependencies
├── .env                  # Configuration (create manually)
├── .gitignore            # Files ignored by Git
├── README.md             # This documentation
└── temp/                 # Temporary audio files (auto-created)
```

---

## 🔄 Updates and Contributions

### Roadmap

- [ ] Document support (PDF, DOCX)
- [ ] Multiple simultaneous sessions support
- [ ] Web management interface
- [ ] Custom commands
- [ ] Persistent logs

### How to Contribute

1. Fork the project
2. Create a branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add feature X'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

- **Claude Code** - [Anthropic](https://www.anthropic.com)
- **Telegram Bot API** - [Telegram](https://core.telegram.org/bots)
- **OpenAI Whisper** - [OpenAI](https://openai.com/research/whisper)

---

## 💡 FAQ

### How much does it cost to use?

- **Telegram Bot**: Free
- **Claude Code**: Requires Claude Pro subscription
- **OpenAI Whisper**: ~$0.006 per minute of audio

### Can I use it in production?

Yes, but add:
- Rate limiting
- Structured logs
- Health checks
- Deploy on a server (not localhost)

### What systems does it work on?

- ✅ Windows 10/11
- ✅ macOS (Intel and Apple Silicon)
- ✅ Linux (Ubuntu, Debian, etc.)

### Do I need to keep my PC on?

Yes, the bot runs locally. To run 24/7:
- Use a VPS (AWS, DigitalOcean, etc.)
- Configure PM2 for auto-restart
- Use systemd on Linux

---

<p align="center">
  Made with ❤️ using Claude Code
</p>
