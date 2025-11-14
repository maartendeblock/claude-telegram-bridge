import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { t, setLanguage, getLanguage, getSupportedLanguages, getDefaultLanguage } from './lib/i18n.js';
import { parseCommand, validateFlags, getClaudeHelp, parseSlashCommand } from './lib/commandParser.js';
import { getSessionPreferences, setSessionPreference, getSessionMetadata, setSessionMetadata, clearSessionMetadata } from './lib/sessionManager.js';
dotenv.config();

// ============================
// CONFIGURAÇÕES
// ============================
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WORKING_DIR = process.env.WORKING_DIR || process.cwd();
const AUTHORIZED_CHAT_IDS = process.env.AUTHORIZED_CHAT_ID
  ? process.env.AUTHORIZED_CHAT_ID.split(',').map(id => id.trim())
  : [];
const CLAUDE_CODE_PATH = process.env.CLAUDE_CODE_PATH || 'claude';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error(t(null, 'errors.noToken'));
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Inicializar OpenAI (opcional, só se tiver API key)
let openai = null;
if (OPENAI_API_KEY && OPENAI_API_KEY !== 'sua_api_key_aqui') {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('✅ OpenAI Whisper enabled for audio transcription');
} else {
  console.log('⚠️ OpenAI API key not configured - audio will be saved without transcription');
}

// Map de sessões: chatId -> { process, sessionId, buffer }
const sessions = new Map();

// ============================
// UTILITÁRIOS
// ============================

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function splitMessage(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text];

  const parts = [];
  let currentPart = '';
  const lines = text.split('\n');

  for (const line of lines) {
    if ((currentPart + line + '\n').length > maxLength) {
      if (currentPart) parts.push(currentPart);
      currentPart = line + '\n';
    } else {
      currentPart += line + '\n';
    }
  }

  if (currentPart) parts.push(currentPart);
  return parts;
}

async function sendMessage(chatId, text, options = {}) {
  if (!text || text.trim() === '') return;

  const parts = splitMessage(text);

  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const prefix = parts.length > 1 ? `[${i + 1}/${parts.length}]\n` : '';
    try {
      await bot.sendMessage(chatId, prefix + parts[i], isLast ? options : {});
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
    }
  }
}

function discoverCustomCommands() {
  try {
    const commandsDir = path.join(WORKING_DIR, '.claude', 'commands');
    if (!fs.existsSync(commandsDir)) {
      return [];
    }

    const files = fs.readdirSync(commandsDir);
    const commands = files
      .filter(f => f.endsWith('.md'))
      .map(f => `/${f.replace('.md', '')}`);

    return commands;
  } catch (error) {
    console.error('⚠️ Error discovering custom commands:', error.message);
    return [];
  }
}

// ============================
// CRIAR SESSÃO STREAM JSON
// ============================

function createClaudeSessionWithFlags(chatId, customFlags = []) {
  console.log(`\n🚀 [${chatId}] Creating stream session with custom flags...`);

  const sessionId = generateUUID();

  // Build base args
  const args = [
    '--print',
    '--verbose',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--replay-user-messages',
    '--session-id', sessionId,
    ...customFlags
  ];

  // No Windows, usar .cmd explicitamente
  const claudeCmd = process.platform === 'win32' && !CLAUDE_CODE_PATH.endsWith('.cmd')
    ? CLAUDE_CODE_PATH + '.cmd'
    : CLAUDE_CODE_PATH;

  const claudeProcess = spawn(claudeCmd, args, {
    cwd: WORKING_DIR,
    shell: true,
    windowsHide: true
  });

  const session = {
    process: claudeProcess,
    sessionId: sessionId,
    buffer: '',
    active: true,
    messageBuffer: new Map()
  };

  sessions.set(chatId, session);

  // ============================
  // PROCESSAR OUTPUT STREAM JSON
  // ============================

  claudeProcess.stdout.on('data', (data) => {
    session.buffer += data.toString();
    processStreamBuffer(chatId, session);
  });

  claudeProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`⚠️ [${chatId}] Stderr: ${text}`);
  });

  claudeProcess.on('error', (error) => {
    console.error(`❌ [${chatId}] Process error:`, error);
    bot.sendMessage(chatId, t(chatId, 'errors.sending', { error: error.message }));
    sessions.delete(chatId);
  });

  claudeProcess.on('close', (code) => {
    console.log(`🔴 [${chatId}] Session closed (code: ${code})`);
    bot.sendMessage(chatId, t(chatId, 'session.closed', { code }));
    sessions.delete(chatId);
  });

  console.log(`✅ [${chatId}] Session created! Session ID: ${sessionId}`);
  return session;
}

function createClaudeSession(chatId) {
  console.log(`\n🚀 [${chatId}] Creating stream session...`);

  const sessionId = generateUUID();

  // Get saved preferences
  const prefs = getSessionPreferences(chatId);

  // Build args array
  const args = [
    '--print',
    '--verbose',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--replay-user-messages',
    '--session-id', sessionId,
  ];

  // Add model if set
  if (prefs.model) {
    args.push('--model', prefs.model);
  }

  // Add tools if set
  if (prefs.tools) {
    args.push('--allowedTools', prefs.tools);
  }

  if (prefs.disabledTools) {
    args.push('--disallowedTools', prefs.disabledTools);
  }

  // Add permissions mode
  const permMode = prefs.permissions || 'skip';
  if (permMode === 'skip') {
    args.push('--dangerously-skip-permissions');
  } else if (permMode === 'strict') {
    // Default mode - no flag needed
  } else if (permMode === 'relaxed') {
    args.push('--permission-mode', 'acceptEdits');
  }

  // Iniciar Claude em modo stream-json
  // No Windows, usar .cmd explicitamente
  const claudeCmd = process.platform === 'win32' && !CLAUDE_CODE_PATH.endsWith('.cmd')
    ? CLAUDE_CODE_PATH + '.cmd'
    : CLAUDE_CODE_PATH;

  const claudeProcess = spawn(claudeCmd, args, {
    cwd: WORKING_DIR,
    shell: true,
    windowsHide: true
  });

  const session = {
    process: claudeProcess,
    sessionId: sessionId,
    buffer: '',
    active: true,
    messageBuffer: new Map() // messageId -> content acumulado
  };

  sessions.set(chatId, session);

  // ============================
  // PROCESSAR OUTPUT STREAM JSON
  // ============================

  claudeProcess.stdout.on('data', (data) => {
    session.buffer += data.toString();
    processStreamBuffer(chatId, session);
  });

  claudeProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`⚠️ [${chatId}] Stderr: ${text}`);
  });

  claudeProcess.on('error', (error) => {
    console.error(`❌ [${chatId}] Process error:`, error);
    bot.sendMessage(chatId, t(chatId, 'errors.sending', { error: error.message }));
    sessions.delete(chatId);
  });

  claudeProcess.on('close', (code) => {
    console.log(`🔴 [${chatId}] Session closed (code: ${code})`);
    bot.sendMessage(chatId, t(chatId, 'session.closed', { code }));
    sessions.delete(chatId);
  });

  console.log(`✅ [${chatId}] Session created! Session ID: ${sessionId}`);
  return session;
}

// ============================
// PROCESSAR BUFFER STREAM JSON
// ============================

function processStreamBuffer(chatId, session) {
  const lines = session.buffer.split('\n');

  // Guardar última linha incompleta
  session.buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const event = JSON.parse(line);
      handleStreamEvent(chatId, session, event);
    } catch (error) {
      console.log(`⚠️ [${chatId}] Non-JSON line ignored: ${line.substring(0, 100)}`);
    }
  }
}

// ============================
// PROCESSAR EVENTOS STREAM
// ============================

const pendingMessages = new Map(); // chatId -> { messageId, content, timeout }

function handleStreamEvent(chatId, session, event) {
  // Log apenas eventos importantes (não logar cada stream_event)
  if (event.type !== 'stream_event') {
    const preview = JSON.stringify(event).substring(0, 80);
    console.log(`📨 [${chatId}] ${event.type}: ${preview}...`);
  }

  switch (event.type) {
    case 'user':
      // Confirmação da mensagem enviada (replay)
      console.log(`✅ [${chatId}] Message confirmed`);
      break;

    case 'assistant':
      // Mensagem completa do assistente - NÃO enviar aqui para evitar duplicação
      // As mensagens já foram enviadas via streaming parcial (content_block_delta)
      console.log(`✅ [${chatId}] Complete message received (already sent via streaming)`);
      break;

    case 'stream_event':
      // Evento de streaming aninhado
      if (event.event) {
        handleStreamingSubEvent(chatId, session, event.event);
      }
      break;

    case 'result':
      // Resultado final - apenas log (mensagem já foi enviada via streaming)
      const success = event.subtype === 'success' ? '✅' : '❌';
      const duration = event.duration_ms ? `${Math.round(event.duration_ms / 1000)}s` : 'N/A';
      console.log(`${success} [${chatId}] Final result - Duration: ${duration}`);
      break;

    case 'system':
      // Mensagem do sistema - ignorar silenciosamente
      break;

    case 'error':
      sendMessage(chatId, t(chatId, 'errors.sending', { error: event.message || 'Unknown error' }));
      break;

    default:
      // Ignorar silenciosamente
      break;
  }
}

function handleStreamingSubEvent(chatId, session, subEvent) {
  switch (subEvent.type) {
    case 'content_block_delta':
      // Conteúdo parcial chegando
      if (subEvent.delta?.text) {
        accumulatePartialMessage(chatId, subEvent.delta.text);
      }
      break;

    case 'message_start':
      console.log(`🎬 [${chatId}] Claude started responding`);
      break;

    case 'message_stop':
      // Forçar flush da mensagem parcial
      flushPartialMessage(chatId);
      console.log(`🏁 [${chatId}] Claude finished responding`);
      break;

    case 'content_block_start':
    case 'content_block_stop':
      // Eventos de controle, ignorar
      break;

    default:
      break;
  }
}

// ============================
// ACUMULAR MENSAGENS PARCIAIS
// ============================

function accumulatePartialMessage(chatId, deltaText) {
  if (!pendingMessages.has(chatId)) {
    pendingMessages.set(chatId, {
      content: '',
      timeout: null,
      lastSent: ''
    });
  }

  const pending = pendingMessages.get(chatId);
  pending.content += deltaText; // Adicionar incrementalmente

  // Cancelar timeout anterior
  if (pending.timeout) {
    clearTimeout(pending.timeout);
  }

  // Enviar após 1.5 segundos de silêncio, ou se acumulou muito (>800 chars novos)
  const newChars = pending.content.length - pending.lastSent.length;
  const shouldSendNow = newChars > 800;

  if (shouldSendNow) {
    flushPartialMessage(chatId);
  } else {
    pending.timeout = setTimeout(() => flushPartialMessage(chatId), 1500);
  }
}

async function flushPartialMessage(chatId) {
  const pending = pendingMessages.get(chatId);
  if (!pending || !pending.content || pending.content === pending.lastSent) return;

  // Enviar apenas o que é novo (diff)
  const newContent = pending.content.substring(pending.lastSent.length);

  if (newContent.trim()) {
    await sendMessage(chatId, `🤖 ${newContent}`);
    pending.lastSent = pending.content;
  }

  if (pending.timeout) {
    clearTimeout(pending.timeout);
    pending.timeout = null;
  }
}

// ============================
// PROCESSAR FOTO
// ============================

async function handlePhotoMessage(chatId, photo) {
  const session = sessions.get(chatId);

  if (!session || !session.active) {
    await bot.sendMessage(chatId, t(chatId, 'errors.noSession'));
    return;
  }

  console.log(`📸 [${chatId}] Processing photo...`);
  await bot.sendChatAction(chatId, 'typing');

  try {
    // Pegar a maior resolução disponível
    const photoFile = photo[photo.length - 1];
    const file = await bot.getFile(photoFile.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;

    // Baixar arquivo
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    // Detectar tipo MIME
    const ext = path.extname(file.file_path).toLowerCase();
    const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.png' ? 'image/png' :
                      ext === '.gif' ? 'image/gif' :
                      ext === '.webp' ? 'image/webp' : 'image/jpeg';

    console.log(`📸 [${chatId}] Photo downloaded (${(buffer.byteLength / 1024).toFixed(1)} KB, ${mediaType})`);

    // Limpar buffer de mensagens pendentes
    if (pendingMessages.has(chatId)) {
      flushPartialMessage(chatId);
      pendingMessages.get(chatId).content = '';
      pendingMessages.get(chatId).lastSent = '';
    }

    // Enviar para Claude no formato stream-json com imagem
    const jsonMessage = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image
            }
          },
          {
            type: 'text',
            text: t(chatId, 'media.imageQuestion')
          }
        ]
      },
      session_id: session.sessionId,
      parent_tool_use_id: null
    }) + '\n';

    session.process.stdin.write(jsonMessage);
    console.log(`✅ [${chatId}] Photo sent to Claude`);

  } catch (error) {
    console.error(`❌ [${chatId}] Error processing photo:`, error);
    await bot.sendMessage(chatId, t(chatId, 'errors.photoProcessing', { error: error.message }));
  }
}

// ============================
// PROCESSAR ÁUDIO/VOZ
// ============================

async function handleVoiceMessage(chatId, voice) {
  const session = sessions.get(chatId);

  if (!session || !session.active) {
    await bot.sendMessage(chatId, t(chatId, 'errors.noSession'));
    return;
  }

  console.log(`🎤 [${chatId}] Processing audio...`);
  await bot.sendChatAction(chatId, 'typing');

  let tempFile = null;

  try {
    const file = await bot.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;

    // Baixar arquivo
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();

    // Salvar temporariamente
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFile = path.join(tempDir, `voice_${Date.now()}_${Math.random().toString(36).substring(7)}.ogg`);
    fs.writeFileSync(tempFile, Buffer.from(buffer));

    console.log(`🎤 [${chatId}] Audio saved (${(buffer.byteLength / 1024).toFixed(1)} KB)`);

    // Se OpenAI está configurado, transcrever
    if (openai) {
      console.log(`🎙️ [${chatId}] Transcribing with Whisper...`);

      // Mapear idioma do usuário para código do Whisper
      const whisperLangMap = {
        'en': 'en',
        'pt': 'pt',
        'nl': 'nl'
      };
      const userLang = getLanguage(chatId);
      const whisperLang = whisperLangMap[userLang] || 'en';

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-1',
        language: whisperLang,
        response_format: 'text'
      });

      console.log(`✅ [${chatId}] Transcription: "${transcription.substring(0, 100)}..."`);

      // Enviar transcrição para o usuário
      await bot.sendMessage(chatId, t(chatId, 'media.audioTranscribed', { transcription }), { parse_mode: 'Markdown' });

      // Enviar transcrição para Claude
      sendToClaudeSession(chatId, transcription);

      // Limpar arquivo imediatamente após transcrever
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log(`🗑️ [${chatId}] Temporary audio removed`);
      }

    } else {
      // Sem OpenAI configurado
      await bot.sendMessage(chatId,
        t(chatId, 'media.audioReceived', { filePath: tempFile }),
        { parse_mode: 'Markdown' }
      );

      // Limpar arquivo depois de 5 minutos
      setTimeout(() => {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log(`🗑️ [${chatId}] Temporary audio removed`);
        }
      }, 5 * 60 * 1000);
    }

  } catch (error) {
    console.error(`❌ [${chatId}] Error processing audio:`, error);

    // Limpar arquivo em caso de erro
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    await bot.sendMessage(chatId, t(chatId, 'errors.audioProcessing', { error: error.message }));
  }
}

// ============================
// ENVIAR MENSAGEM PARA CLAUDE
// ============================

function sendToClaudeSession(chatId, message) {
  const session = sessions.get(chatId);

  if (!session || !session.active) {
    bot.sendMessage(chatId, t(chatId, 'errors.noSession'));
    return false;
  }

  console.log(`💬 [${chatId}] Sending: "${message}"`);

  // Limpar buffer de mensagens pendentes antes de enviar nova mensagem
  if (pendingMessages.has(chatId)) {
    flushPartialMessage(chatId);
    pendingMessages.get(chatId).content = '';
    pendingMessages.get(chatId).lastSent = '';
  }

  try {
    // Formato stream-json correto
    const jsonMessage = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: message
      },
      session_id: session.sessionId,
      parent_tool_use_id: null
    }) + '\n';
    session.process.stdin.write(jsonMessage);
    return true;
  } catch (error) {
    console.error(`❌ [${chatId}] Error sending:`, error);
    bot.sendMessage(chatId, t(chatId, 'errors.sending', { error: error.message }));
    return false;
  }
}

// ============================
// HANDLERS TELEGRAM
// ============================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const chatType = msg.chat.type; // 'private', 'group', 'supergroup'
  const isGroup = chatType === 'group' || chatType === 'supergroup';

  // Auto-detect language on first interaction (if not already set)
  const currentLang = getLanguage(chatId);
  const defaultLang = getDefaultLanguage();
  if (currentLang === defaultLang) {
    const userLangCode = msg.from?.language_code; // ISO 639-1 code from Telegram
    if (userLangCode) {
      // Map Telegram language codes to our supported languages
      const langMap = {
        'en': 'en',
        'pt': 'pt',
        'pt-BR': 'pt',
        'pt-PT': 'pt',
        'nl': 'nl',
        'nl-BE': 'nl',
        'nl-NL': 'nl'
      };

      const detectedLang = langMap[userLangCode] || langMap[userLangCode?.split('-')[0]];
      if (detectedLang && getSupportedLanguages().includes(detectedLang)) {
        setLanguage(chatId, detectedLang);
        console.log(`🌍 Auto-detected language: ${detectedLang} for chat ${chatId}`);
      }
    }
  }

  // Verificar autorização
  if (AUTHORIZED_CHAT_IDS.length > 0 && !AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
    await bot.sendMessage(chatId, t(chatId, 'errors.unauthorized'));
    console.log(`⚠️ Access denied: ${chatId} (${chatType})`);
    return;
  }

  // Log do chat ID (útil para descobrir IDs de grupos)
  if (AUTHORIZED_CHAT_IDS.length === 0) {
    const chatName = msg.chat.title || msg.chat.username || msg.chat.first_name || 'Unknown';
    console.log(`📱 Chat ID: ${chatId} | Type: ${chatType} | Name: ${chatName} (configure in .env)`);
  }

  // ============================
  // PROCESSAR FOTO
  // ============================
  if (msg.photo) {
    await handlePhotoMessage(chatId, msg.photo);
    return;
  }

  // ============================
  // PROCESSAR ÁUDIO/VOZ
  // ============================
  if (msg.voice || msg.audio) {
    await handleVoiceMessage(chatId, msg.voice || msg.audio);
    return;
  }

  // ============================
  // COMANDOS
  // ============================

  // ============================
  // /COMMAND - Execute Claude CLI with custom flags
  // ============================
  if (text && text.startsWith('/command')) {
    const commandText = text.substring(9).trim(); // Remove "/command "

    // Handle --help
    if (!commandText || commandText === '--help' || commandText === '-h') {
      let helpText = t(chatId, 'commands.command.helpHeader') + '\n\n';

      // Get Claude CLI help
      const claudeHelp = getClaudeHelp();
      helpText += '```\n' + claudeHelp + '\n```';

      // List custom slash commands
      const customCommands = discoverCustomCommands();
      if (customCommands.length > 0) {
        helpText += '\n' + t(chatId, 'commands.command.customCommandsHeader') + '\n';
        customCommands.forEach(cmd => {
          helpText += `• \`${cmd}\`\n`;
        });
      } else {
        helpText += '\n' + t(chatId, 'commands.command.noCustomCommands');
      }

      // List shortcuts
      helpText += '\n' + t(chatId, 'commands.command.shortcutsHeader') + '\n';
      helpText += '• `/model` - Switch model\n';
      helpText += '• `/resume` - Resume session\n';
      helpText += '• `/continue` - Continue last conversation\n';
      helpText += '• `/tools` - Manage tools\n';
      helpText += '• `/permissions` - Set permission mode\n';

      await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
      return;
    }

    // Parse command
    const parsed = parseCommand(commandText);

    // Validate flags
    const validation = validateFlags(parsed.flags);
    if (!validation.valid) {
      let errorMsg = '';
      validation.errors.forEach(flag => {
        errorMsg += t(chatId, 'commands.command.forbidden', { flag }) + '\n';
      });
      await bot.sendMessage(chatId, errorMsg.trim(), { parse_mode: 'Markdown' });
      return;
    }

    // Check if it's a slash command
    if (parsed.slashCommand) {
      await bot.sendMessage(chatId, t(chatId, 'commands.command.executing', { command: parsed.slashCommand }));

      // Build args for slash command
      const slashArgs = ['--dangerously-skip-permissions', parsed.slashCommand, ...parsed.args];

      // Kill existing session
      const oldSession = sessions.get(chatId);
      if (oldSession?.process) {
        oldSession.process.kill();
        sessions.delete(chatId);
        pendingMessages.delete(chatId);
      }

      // Create session with slash command
      const session = createClaudeSessionWithFlags(chatId, slashArgs);
      return;
    }

    // Execute with custom flags + prompt
    if (parsed.prompt) {
      await bot.sendMessage(chatId, t(chatId, 'commands.command.executing', { command: commandText }));

      // Build args from flags
      const customArgs = [];
      parsed.flags.forEach(flag => {
        customArgs.push(flag.name);
        if (flag.value !== true) {
          customArgs.push(flag.value);
        }
      });

      // Add skip permissions
      customArgs.push('--dangerously-skip-permissions');

      // Kill existing session
      const oldSession = sessions.get(chatId);
      if (oldSession?.process) {
        oldSession.process.kill();
        sessions.delete(chatId);
        pendingMessages.delete(chatId);
      }

      // Create session with custom flags
      const session = createClaudeSessionWithFlags(chatId, customArgs);

      // Send prompt to session
      setTimeout(() => {
        sendToClaudeSession(chatId, parsed.prompt);
      }, 500);

      return;
    }

    // No prompt provided
    await bot.sendMessage(chatId, t(chatId, 'commands.command.noArgs', {
      usage: t(chatId, 'commands.command.usage')
    }), { parse_mode: 'Markdown' });
    return;
  }

  // ============================
  // /MODEL - Switch Claude model
  // ============================
  if (text && text.startsWith('/model')) {
    const args = text.split(' ');

    // No args - show current model
    if (args.length === 1) {
      const prefs = getSessionPreferences(chatId);
      const current = prefs.model || 'sonnet';
      await bot.sendMessage(chatId, t(chatId, 'commands.model.current', { model: current }));
      return;
    }

    const model = args[1].toLowerCase();

    // Validate model
    if (!['sonnet', 'opus', 'haiku'].includes(model)) {
      await bot.sendMessage(chatId, t(chatId, 'commands.model.invalid', { model }));
      return;
    }

    // Save preference
    setSessionPreference(chatId, 'model', model);

    // Auto-restart session if one exists
    const session = sessions.get(chatId);
    if (session?.process) {
      await bot.sendMessage(chatId, t(chatId, 'commands.model.restarting', { model }), { parse_mode: 'Markdown' });

      // Kill old session
      session.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);

      // Start new session with model
      const newSession = createClaudeSession(chatId);
      await bot.sendMessage(chatId, t(chatId, 'commands.model.changed', { model }), { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, t(chatId, 'commands.model.changed', { model }), { parse_mode: 'Markdown' });
    }

    return;
  }

  // ============================
  // /RESUME - Resume a previous session
  // ============================
  if (text && text.startsWith('/resume')) {
    const args = text.split(' ');

    if (args.length < 2) {
      await bot.sendMessage(chatId, t(chatId, 'commands.resume.usage'));
      return;
    }

    const sessionId = args[1];

    // Kill existing session
    const oldSession = sessions.get(chatId);
    if (oldSession?.process) {
      oldSession.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);
    }

    await bot.sendMessage(chatId, t(chatId, 'commands.resume.resuming', { sessionId }), { parse_mode: 'Markdown' });

    // Create session with --resume flag
    const session = createClaudeSessionWithFlags(chatId, ['--resume', sessionId, '--dangerously-skip-permissions']);

    await bot.sendMessage(chatId, t(chatId, 'commands.resume.resumed', { sessionId }), { parse_mode: 'Markdown' });
    return;
  }

  // ============================
  // /CONTINUE - Continue most recent conversation
  // ============================
  if (text === '/continue') {
    // Kill existing session
    const oldSession = sessions.get(chatId);
    if (oldSession?.process) {
      oldSession.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);
    }

    await bot.sendMessage(chatId, t(chatId, 'commands.continue.continuing'));

    // Create session with --continue flag
    const session = createClaudeSessionWithFlags(chatId, ['--continue', '--dangerously-skip-permissions']);

    await bot.sendMessage(chatId, t(chatId, 'commands.continue.continued'));
    return;
  }

  // ============================
  // /TOOLS - Manage available tools
  // ============================
  if (text && text.startsWith('/tools')) {
    const args = text.split(' ');

    if (args.length === 1 || args[1] === 'list') {
      // List available tools
      const tools = ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch'];
      await bot.sendMessage(chatId, t(chatId, 'commands.tools.listing', { tools: tools.join(', ') }), { parse_mode: 'Markdown' });
      return;
    }

    const action = args[1];
    const toolList = args.slice(2).join(' ');

    if (action === 'enable') {
      setSessionPreference(chatId, 'tools', toolList);

      const session = sessions.get(chatId);
      if (session?.process) {
        await bot.sendMessage(chatId, t(chatId, 'commands.tools.enabling', { tools: toolList }));

        session.process.kill();
        sessions.delete(chatId);
        pendingMessages.delete(chatId);

        const newSession = createClaudeSession(chatId);
        await bot.sendMessage(chatId, t(chatId, 'commands.tools.enabled', { tools: toolList }));
      } else {
        await bot.sendMessage(chatId, t(chatId, 'commands.tools.enabled', { tools: toolList }));
      }
    } else if (action === 'disable') {
      setSessionPreference(chatId, 'disabledTools', toolList);

      const session = sessions.get(chatId);
      if (session?.process) {
        await bot.sendMessage(chatId, t(chatId, 'commands.tools.disabling', { tools: toolList }));

        session.process.kill();
        sessions.delete(chatId);
        pendingMessages.delete(chatId);

        const newSession = createClaudeSession(chatId);
        await bot.sendMessage(chatId, t(chatId, 'commands.tools.disabled', { tools: toolList }));
      } else {
        await bot.sendMessage(chatId, t(chatId, 'commands.tools.disabled', { tools: toolList }));
      }
    } else {
      await bot.sendMessage(chatId, t(chatId, 'commands.tools.invalid'));
    }

    return;
  }

  // ============================
  // /PERMISSIONS - Control permission approval mode
  // ============================
  if (text && text.startsWith('/permissions')) {
    const args = text.split(' ');

    if (args.length === 1) {
      const prefs = getSessionPreferences(chatId);
      const mode = prefs.permissions || 'skip';
      await bot.sendMessage(chatId, t(chatId, 'commands.permissions.current', {
        mode: t(chatId, `commands.permissions.${mode}`)
      }));
      return;
    }

    const mode = args[1].toLowerCase();

    if (!['strict', 'relaxed', 'skip'].includes(mode)) {
      await bot.sendMessage(chatId, t(chatId, 'commands.permissions.invalid', { mode }));
      return;
    }

    setSessionPreference(chatId, 'permissions', mode);

    const session = sessions.get(chatId);
    if (session?.process) {
      await bot.sendMessage(chatId, t(chatId, 'commands.permissions.changing', { mode }), { parse_mode: 'Markdown' });

      session.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);

      const newSession = createClaudeSession(chatId);
      await bot.sendMessage(chatId, t(chatId, 'commands.permissions.changed', { mode }), { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, t(chatId, 'commands.permissions.changed', { mode }), { parse_mode: 'Markdown' });
    }

    return;
  }

  if (text === '/start') {
    // Encerrar sessão anterior se existir
    const oldSession = sessions.get(chatId);
    if (oldSession?.process) {
      oldSession.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);
    }

    // Criar nova sessão
    const session = createClaudeSession(chatId);

    const chatIcon = isGroup ? '👥' : '💬';
    const chatType = t(chatId, isGroup ? 'commands.chatTypeGroup' : 'commands.chatTypePrivate');
    const whisperStatus = openai ? t(chatId, 'commands.whisperActive') : '';
    const whisperLine = openai ? t(chatId, 'commands.whisperConfigLine') : t(chatId, 'commands.whisperMissingLine');
    const groupWarning = isGroup ? t(chatId, 'commands.groupWarning') : '';

    await bot.sendMessage(chatId,
      t(chatId, 'commands.start', {
        chatIcon,
        chatType,
        whisperStatus,
        sessionId: session.sessionId,
        directory: WORKING_DIR,
        whisperLine,
        groupWarning
      }),
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (text === '/stop') {
    const session = sessions.get(chatId);
    if (session?.process) {
      session.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);
      await bot.sendMessage(chatId, t(chatId, 'session.stopped'));
    } else {
      await bot.sendMessage(chatId, t(chatId, 'session.noSession'));
    }
    return;
  }

  if (text === '/status') {
    const session = sessions.get(chatId);

    if (session?.active) {
      await bot.sendMessage(chatId,
        t(chatId, 'session.statusActive', {
          sessionId: session.sessionId,
          pid: session.process.pid,
          directory: WORKING_DIR
        }),
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.sendMessage(chatId, t(chatId, 'session.statusInactive'), { parse_mode: 'Markdown' });
    }
    return;
  }

  if (text === '/help') {
    const whisperStatus = openai ? ' (✅ active)' : ' (⚠️ configure OPENAI_API_KEY)';
    await bot.sendMessage(chatId,
      t(chatId, 'commands.help', { whisperStatus }),
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // ============================
  // COMANDO /LANG - MUDAR IDIOMA
  // ============================
  if (text && text.startsWith('/lang')) {
    const args = text.split(' ');

    if (args.length === 1) {
      // Mostrar idioma atual e opções
      await bot.sendMessage(chatId,
        t(chatId, 'language.currentLanguage') +
        t(chatId, 'language.availableLanguages'),
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const newLang = args[1].toLowerCase();

    if (['en', 'pt', 'nl'].includes(newLang)) {
      setLanguage(chatId, newLang);
      await bot.sendMessage(chatId, t(chatId, 'language.languageChanged'));
    } else {
      await bot.sendMessage(chatId, t(chatId, 'language.invalidLanguage'));
    }
    return;
  }

  // ============================
  // MENSAGEM NORMAL
  // ============================
  if (text && !text.startsWith('/')) {
    sendToClaudeSession(chatId, text);
  }
});

// ============================
// ERROR HANDLERS
// ============================
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Closing all sessions...');

  for (const [chatId, session] of sessions.entries()) {
    if (session.process) {
      console.log(`🛑 Closing session ${chatId}...`);
      session.process.kill();
    }
  }

  process.exit(0);
});

// ============================
// INICIALIZAÇÃO
// ============================
console.log('╔════════════════════════════════════════════╗');
console.log('║   TELEGRAM CLAUDE CODE STREAM             ║');
console.log('║      Real-Time JSON Streaming             ║');
console.log('╚════════════════════════════════════════════╝');
console.log(`📁 Directory: ${WORKING_DIR}`);
console.log(`🤖 Claude CLI: ${CLAUDE_CODE_PATH}`);
if (AUTHORIZED_CHAT_IDS.length > 0) {
  console.log(`🔐 Authorization: Enabled (${AUTHORIZED_CHAT_IDS.length} authorized chat(s))`);
  AUTHORIZED_CHAT_IDS.forEach(id => console.log(`   ├─ Chat ID: ${id}`));
} else {
  console.log(`🔐 Authorization: Disabled (any chat can use)`);
}
console.log('✅ Bot started - Waiting for commands...\n');
