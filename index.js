import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { t, setLanguage, getLanguage, getSupportedLanguages, getDefaultLanguage } from './lib/i18n.js';
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

// ============================
// CRIAR SESSÃO STREAM JSON
// ============================

function getClaudeCommands() {
  // If user specified a full path, use it as-is
  if (CLAUDE_CODE_PATH.includes('/') || CLAUDE_CODE_PATH.includes('\\')) {
    return [CLAUDE_CODE_PATH];
  }

  // On Windows, try both with and without .cmd extension
  if (process.platform === 'win32') {
    if (CLAUDE_CODE_PATH.endsWith('.cmd')) {
      return [CLAUDE_CODE_PATH, CLAUDE_CODE_PATH.slice(0, -4)];
    }
    return [CLAUDE_CODE_PATH, CLAUDE_CODE_PATH + '.cmd'];
  }

  return [CLAUDE_CODE_PATH];
}

function spawnClaudeProcess(claudeCmd, sessionId) {
  return spawn(claudeCmd, [
    '--print',
    '--verbose',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--replay-user-messages',
    '--session-id', sessionId,
    '--dangerously-skip-permissions'
  ], {
    cwd: WORKING_DIR,
    shell: true,
    windowsHide: true
  });
}

function createClaudeSession(chatId) {
  console.log(`\n🚀 [${chatId}] Creating stream session...`);

  const sessionId = generateUUID();
  const commands = getClaudeCommands();

  let claudeProcess = null;
  let usedCommand = null;

  // Try each command until one works
  for (const cmd of commands) {
    try {
      claudeProcess = spawnClaudeProcess(cmd, sessionId);
      usedCommand = cmd;
      console.log(`🔧 [${chatId}] Trying command: ${cmd}`);
      break;
    } catch (error) {
      console.log(`⚠️ [${chatId}] Command ${cmd} failed to spawn: ${error.message}`);
    }
  }

  if (!claudeProcess) {
    console.error(`❌ [${chatId}] Failed to spawn Claude with any command`);
    bot.sendMessage(chatId, t(chatId, 'errors.sending', { error: 'Failed to start Claude CLI' }));
    return null;
  }

  const session = {
    process: claudeProcess,
    sessionId: sessionId,
    buffer: '',
    active: true,
    messageBuffer: new Map(),
    command: usedCommand
  };

  sessions.set(chatId, session);

  // Handle spawn errors (e.g., command not found)
  claudeProcess.on('error', (error) => {
    console.error(`❌ [${chatId}] Process error:`, error);

    // If command not found, try alternate command
    if (error.code === 'ENOENT' && commands.length > 1) {
      const currentIndex = commands.indexOf(session.command);
      const nextCommand = commands[currentIndex + 1];

      if (nextCommand) {
        console.log(`🔄 [${chatId}] Retrying with: ${nextCommand}`);
        sessions.delete(chatId);

        // Retry with alternate command
        const retryProcess = spawnClaudeProcess(nextCommand, sessionId);
        session.process = retryProcess;
        session.command = nextCommand;
        sessions.set(chatId, session);
        setupProcessHandlers(chatId, session, retryProcess);
        return;
      }
    }

    bot.sendMessage(chatId, t(chatId, 'errors.sending', { error: error.message }));
    sessions.delete(chatId);
  });

  setupProcessHandlers(chatId, session, claudeProcess);

  console.log(`✅ [${chatId}] Session created! Session ID: ${sessionId}`);
  return session;
}

function setupProcessHandlers(chatId, session, claudeProcess) {
  claudeProcess.stdout.on('data', (data) => {
    session.buffer += data.toString();
    processStreamBuffer(chatId, session);
  });

  claudeProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`⚠️ [${chatId}] Stderr: ${text}`);
  });

  claudeProcess.on('close', (code) => {
    console.log(`🔴 [${chatId}] Session closed (code: ${code})`);
    bot.sendMessage(chatId, t(chatId, 'session.closed', { code }));
    sessions.delete(chatId);
  });
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
