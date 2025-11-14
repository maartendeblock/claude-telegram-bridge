[🇬🇧 English](./README.en.md) | [🇧🇷 Português](./README.md) | [🇳🇱 Nederlands](./README.nl.md)

---

# 🤖 Telegram Claude Code Bot

Volledige controle over Claude Code via Telegram met ondersteuning voor **tekst**, **afbeeldingen** (vision) en **audio** (automatische transcriptie)!

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Claude_Code-Stream_JSON-blue.svg" alt="Claude Code">
  <img src="https://img.shields.io/badge/Telegram-Bot_API-blue.svg" alt="Telegram">
  <img src="https://img.shields.io/badge/OpenAI-Whisper-orange.svg" alt="Whisper">
</p>

## ✨ Functies

### 💬 **Volledige Interactie**
- 🔄 **Real-time streaming** - Zie Claude denken en reageren
- 🧠 **Blijvende context** - Sessies behouden volledige geschiedenis
- ⚡ **Gedeeltelijke berichten** - Progressieve updates terwijl Claude verwerkt
- 🛠️ **Tool meldingen** - Zie wanneer Claude commando's uitvoert

### 📸 **Multimedia Ondersteuning**
- 🖼️ **Afbeelding analyse** - Stuur foto's en Claude analyseert met vision
- 🎤 **Audio transcriptie** - Stuur spraakberichten, automatisch getranscribeerd via Whisper
- 📁 **Lokale bestanden** - Claude kan lezen/schrijven in de werkdirectory

### 🌍 **Meertalige Ondersteuning**
- 🇬🇧 **Engels** - Standaardtaal
- 🇧🇷 **Portugees** - Volledige ondersteuning
- 🇳🇱 **Nederlands** - Volledige ondersteuning
- 🔄 **Taal wisselen** - Gebruik `/lang` om tussen talen te wisselen
- 🎙️ **Transcriptie in elke taal** - Whisper detecteert automatisch de geselecteerde taal

### 🔒 **Beveiliging**
- 🔐 **Chat ID authenticatie** - Alleen jij kunt de bot gebruiken
- ✅ **Toestemming goedkeuring** - Volledige controle over Claude's acties
- 🚫 **Optioneel auto-skip** - `--dangerously-skip-permissions` modus

### 👥 **Groepsondersteuning**
- 🗣️ **Gedeelde sessie** - Gebruik Claude Code in Telegram groepen
- 👥 **Samenwerking** - Alle leden kunnen met Claude interacteren
- 📝 **Enkele geschiedenis** - Één gedeeld gesprek per groep
- 📖 **[Bekijk complete gids](GROUPS.nl.md)** - Gedetailleerde setup instructies

---

## 🚀 Installatie

### 1️⃣ Vereisten

- **Node.js 18+** ([Download](https://nodejs.org))
- **Claude Code CLI** geïnstalleerd en geconfigureerd ([Docs](https://docs.claude.com/en/docs/claude-code))
- **Telegram account**

### 2️⃣ Kloon en Installeer

```bash
git clone https://github.com/jouw-gebruikersnaam/telegram-claude-bot.git
cd telegram-claude-bot
npm install
```

### 3️⃣ Configureer `.env`

Maak een `.env` bestand in de projectroot:

```env
# ============================================
# VERPLICHT
# ============================================

# Telegram bot token (verkrijg van @BotFather)
TELEGRAM_BOT_TOKEN=jouw_token_hier

# ============================================
# AANBEVOLEN
# ============================================

# Geautoriseerde chat ID (jouw Telegram Chat ID)
# Kan een enkele ID zijn of meerdere (privéchat + groepen) gescheiden door komma
# Voorbeeld: AUTHORIZED_CHAT_ID=123456789,-987654321
AUTHORIZED_CHAT_ID=jouw_chat_id_hier

# Claude Code werkdirectory
WORKING_DIR=C:\jouw\project

# Pad naar Claude Code executable
CLAUDE_CODE_PATH=claude

# ============================================
# OPTIONEEL - Audio transcriptie
# ============================================

# OpenAI API Key (voor Whisper - audio transcriptie)
OPENAI_API_KEY=sk-proj-...jouw_key_hier...

# ============================================
# OPTIONEEL - Taal / Language
# ============================================

# Standaardtaal voor nieuwe gebruikers
# Default language for new users (en, pt, of nl)
DEFAULT_LANGUAGE=en
```

#### 🔑 Hoe je de **Bot Token** krijgt:

1. Open [@BotFather](https://t.me/botfather) op Telegram
2. Stuur `/newbot`
3. Kies een naam en gebruikersnaam voor je bot
4. Kopieer de verstrekte token

#### 🆔 Hoe je jouw **Chat ID** krijgt:

1. Start de bot **zonder** `AUTHORIZED_CHAT_ID` te configureren
2. Stuur `/start` naar de bot
3. Controleer de server console: `📱 Jouw Chat ID: 123456789`
4. Voeg het toe aan `.env`

#### 🎙️ Hoe je **OpenAI API Key** krijgt (optioneel):

1. Bezoek [platform.openai.com](https://platform.openai.com)
2. Maak een account en ga naar **API Keys**
3. Genereer een nieuwe sleutel
4. Voeg het toe aan `.env`

> **⚠️ BELANGRIJK:** Commit het `.env` bestand nooit! Het bevat gevoelige informatie.

### 4️⃣ Uitvoeren

```bash
npm start
```

of voor ontwikkeling met auto-reload:

```bash
npm run dev
```

---

## 📱 Hoe te Gebruiken

### Beschikbare Commando's

| Commando | Beschrijving |
|---------|-----------|
| `/start` | Start een nieuwe Claude Code sessie |
| `/stop` | Beëindig de huidige sessie |
| `/status` | Toon sessie status (PID, Session ID, etc.) |
| `/help` | Toon help en functies |
| `/lang` | Verander interface taal (en, pt, nl) |
| `/lang en` | Schakel over naar Engels |
| `/lang pt` | Schakel over naar Portugees |
| `/lang nl` | Schakel over naar Nederlands |

### Geavanceerde Commando's

De bot ondersteunt nu geavanceerde Claude Code CLI commando's!

#### Directe CLI Uitvoering
```bash
/command <flags> <prompt>
/command --help                    # Bekijk alle Claude CLI opties
/command --model opus "Schrijf een gedicht"
/command --tools Bash,Read "Lijst bestanden"
/command /review-pr 123            # Voer aangepast commando uit
```

#### Snelle Snelkoppelingen

**Wissel Model:**
```bash
/model                    # Bekijk huidig model
/model sonnet            # Gebruik Claude Sonnet
/model opus              # Gebruik Claude Opus
/model haiku             # Gebruik Claude Haiku
```

**Hervat Gesprekken:**
```bash
/resume <session-id>     # Hervat specifieke sessie
/continue                # Ga door met meest recente gesprek
```

**Beheer Tools:**
```bash
/tools                   # Lijst beschikbare tools
/tools list              # Lijst beschikbare tools
/tools enable Bash,Read  # Schakel alleen specifieke tools in
/tools disable Write     # Schakel specifieke tools uit
```

**Beheer Toestemmingen:**
```bash
/permissions             # Bekijk huidige modus
/permissions strict      # Vraag om elke toestemming
/permissions relaxed     # Auto-goedkeuren van lezen
/permissions skip        # Auto-goedkeuren van alles (standaard)
```

#### Aangepaste Commando's

De bot ontdekt automatisch aangepaste commando's in `.claude/commands/`:
```bash
/command /review-pr 123
/command /fix-bug "Bug beschrijving"
/command /optimize main.js
```

### 🌐 Taalselectie

De bot ondersteunt **3 talen** voor de volledige interface en berichten:

**Standaardtaal**: Engels (English)

Om de **taal te wijzigen**, gebruik het `/lang` commando:

```
/lang              # Toon huidige taal en beschikbare opties
/lang en           # Schakel over naar Engels (English) 🇬🇧
/lang pt           # Schakel over naar Portugees 🇧🇷
/lang nl           # Schakel over naar Nederlands 🇳🇱
```

De wijziging is onmiddellijk en wordt bevestigd op het scherm. Alle bot berichten worden weergegeven in de geselecteerde taal, inclusief:
- Statusberichten
- Foutmeldingen
- Verwerkingsfeedback
- Audio transcriptie (in de geselecteerde taal)

**Persistência / Persistence / Persistentie:**
- Suas preferências de idioma são salvas automaticamente
- Your language preferences are saved automatically
- Je taalvoorkeuren worden automatisch opgeslagen
- Armazenadas em `data/language-preferences.json`
- Stored in `data/language-preferences.json`
- Opgeslagen in `data/language-preferences.json`

### 💬 Tekstinteractie

Typ gewoon je bericht normaal:

```
Jij: Lijst de bestanden in de huidige directory

Claude: 🤖 Ik zal het Bash commando gebruiken om...
        [streaming...]
        📁 Bestanden gevonden:
        - index.js
        - package.json
        - README.md
```

### 📸 Afbeeldingen Verzenden

Stuur een foto direct in de chat:

```
[Je stuurt een code screenshot]

Claude: 🤖 Ik zie JavaScript code die...
        - Een async functie definieert
        - Fetch gebruikt om requests te maken
        - Een try/catch heeft voor foutafhandeling

        Wil je dat ik verbeteringen voorstel?
```

### 🎤 Spraakberichten

Neem audio op en verstuur:

```
[Je stuurt audio: "Claude, maak een basis Express server"]

Bot: 🎤 Audio getranscribeerd:
     "Claude, maak een basis Express server"

Claude: 🤖 Ik zal een Express server maken...
        [maakt de code]
```

### ✅ Toestemming Goedkeuring

Wanneer Claude toestemming nodig heeft, krijg je knoppen:

```
Claude: 🔐 TOESTEMMING VEREIST:
        Claude toestaan om bestand server.js te schrijven?

        [✅ Toestaan (Y)] [❌ Weigeren (N)]
```

Klik om goed te keuren of te weigeren.

---

## 🔧 Hoe het Werkt

### Architectuur

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Telegram   │─────▶│  Node.js Bot │─────▶│  Claude Code    │
│  Gebruiker  │◀─────│   (index.js) │◀─────│  (stream-json)  │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  OpenAI      │
                     │  Whisper API │
                     └──────────────┘
```

### Streaming Flow

1. **Spawn Process** - Start `claude` met `--print --output-format stream-json` modus
2. **Session ID** - Gegenereerde UUID om context tussen berichten te behouden
3. **Stream Events** - Vangt JSON events in real-time:
   - `message_start` - Claude begon te reageren
   - `content_block_delta` - Gedeeltelijke tekst aankomend
   - `message_stop` - Volledig antwoord
   - `tool_use` - Claude voert tool uit
4. **Debounce** - Groepeert tekst in chunks om naar Telegram te sturen
5. **Bidirectioneel** - Jouw antwoorden gaan direct naar Claude's stdin

### Berichtformaat (Stream JSON)

**Input (jij → Claude):**
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "Jouw bericht hier"
  },
  "session_id": "sessie-uuid",
  "parent_tool_use_id": null
}
```

**Output (Claude → jij):**
```json
{
  "type": "stream_event",
  "event": {
    "type": "content_block_delta",
    "delta": {
      "type": "text_delta",
      "text": "Gedeeltelijke tekst..."
    }
  }
}
```

---

## 🛡️ Beveiliging en Best Practices

### ✅ Aanbevelingen

- **Gebruik `AUTHORIZED_CHAT_ID`** - Bescherm je bot tegen ongeautoriseerde toegang
- **Commit `.env` nooit** - Je credentials moeten lokaal blijven
- **Controleer toestemmingen** - Keur alleen acties goed die je vertrouwt
- **Monitor gebruik** - Houd de console logs in de gaten

### ⚠️ Belangrijke Waarschuwingen

- De bot voert commando's uit op **jouw lokale systeem**
- Claude kan **bestanden lezen/schrijven** in de `WORKING_DIR`
- Audio transcripties worden verzonden naar **OpenAI's API**
- Afbeeldingen worden verzonden naar **Anthropic's API**

### 🔒 `.gitignore`

Het `.gitignore` bestand is al geconfigureerd om te beschermen:
```
node_modules/
temp/
*.log
.env
```

---

## 🐛 Probleemoplossing

### Bot reageert niet

**Mogelijke oorzaken:**
- Incorrecte Telegram token
- Claude Code is niet geïnstalleerd
- Firewall blokkeert verbindingen

**Oplossing:**
```bash
# Controleer of Claude Code is geïnstalleerd
claude --version

# Test handmatig
claude --print --output-format text "Hallo"

# Controleer console logs
```

### "Ongeautoriseerde toegang"

**Oorzaak:** Jouw Chat ID staat niet in `.env`

**Oplossing:**
1. Verwijder tijdelijk `AUTHORIZED_CHAT_ID`
2. Stuur `/start` naar de bot
3. Controleer je Chat ID in de console
4. Voeg het toe aan `.env`

### Audio transcribeert niet

**Oorzaak:** `OPENAI_API_KEY` niet geconfigureerd

**Oplossing:**
- Configureer OpenAI sleutel in `.env`
- Herstart de bot
- De bot zal tonen: `✅ OpenAI Whisper ingeschakeld`

### Afbeeldingen werken niet

**Mogelijke oorzaken:**
- Bestand te groot (>10MB)
- Niet-ondersteund formaat

**Ondersteunde formaten:**
- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`

### Claude behoudt geen context

**Oplossing:**
```bash
# In Telegram:
/stop
/start

# De Session ID verandert, context wordt gereset
```

---

## 📂 Projectstructuur

```
telegram-claude-bot/
├── index.js              # Hoofdcode van de bot
├── package.json          # Node.js afhankelijkheden
├── .env                  # Configuratie (handmatig aanmaken)
├── .gitignore            # Bestanden genegeerd door Git
├── README.md             # Deze documentatie
└── temp/                 # Tijdelijke audiobestanden (auto-aangemaakt)
```

---

## 🔄 Updates en Bijdragen

### Roadmap

- [ ] Documentondersteuning (PDF, DOCX)
- [ ] Meerdere gelijktijdige sessies ondersteuning
- [ ] Web management interface
- [ ] Aangepaste commando's
- [ ] Blijvende logs

### Hoe Bij te Dragen

1. Fork het project
2. Maak een branch (`git checkout -b feature/nieuwe-functie`)
3. Commit je wijzigingen (`git commit -m 'Voeg functie X toe'`)
4. Push naar de branch (`git push origin feature/nieuwe-functie`)
5. Open een Pull Request

---

## 📄 Licentie

MIT License - zie [LICENSE](LICENSE) voor details.

---

## 🙏 Credits

- **Claude Code** - [Anthropic](https://www.anthropic.com)
- **Telegram Bot API** - [Telegram](https://core.telegram.org/bots)
- **OpenAI Whisper** - [OpenAI](https://openai.com/research/whisper)

---

## 💡 FAQ

### Hoeveel kost het gebruik?

- **Telegram Bot**: Gratis
- **Claude Code**: Vereist Claude Pro abonnement
- **OpenAI Whisper**: ~$0.006 per minuut audio

### Kan ik het in productie gebruiken?

Ja, maar voeg toe:
- Rate limiting
- Gestructureerde logs
- Health checks
- Deploy op een server (niet localhost)

### Op welke systemen werkt het?

- ✅ Windows 10/11
- ✅ macOS (Intel en Apple Silicon)
- ✅ Linux (Ubuntu, Debian, etc.)

### Moet ik mijn PC aan laten staan?

Ja, de bot draait lokaal. Om 24/7 te draaien:
- Gebruik een VPS (AWS, DigitalOcean, etc.)
- Configureer PM2 voor auto-restart
- Gebruik systemd op Linux

---

<p align="center">
  Gemaakt met ❤️ met Claude Code
</p>
