import { execSync } from 'child_process';

// ============================
// CONFIGURATION
// ============================

/**
 * Flags that are forbidden because they're managed by the bot
 * These flags control the bot's internal behavior and should not be overridden by users
 */
const FORBIDDEN_FLAGS = [
  '--session-id',
  '--input-format',
  '--output-format',
  '--print',
  '--verbose',
  '--replay-user-messages',
  '--include-partial-messages'
];

/**
 * Known boolean flags that don't require values
 */
const BOOLEAN_FLAGS = [
  '--continue',
  '--fork-session',
  '--help',
  '--version'
];

// ============================
// PARSING FUNCTIONS
// ============================

/**
 * Parse quoted strings and split by spaces
 * Handles both single and double quotes
 * @param {string} text - Text to tokenize
 * @returns {string[]} Array of tokens
 */
function tokenize(text) {
  const tokens = [];
  let current = '';
  let inQuote = null; // null, '"', or "'"

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle quotes
    if ((char === '"' || char === "'") && text[i - 1] !== '\\') {
      if (inQuote === char) {
        // End quote
        inQuote = null;
      } else if (!inQuote) {
        // Start quote
        inQuote = char;
      } else {
        // Different quote type inside quotes - treat as regular char
        current += char;
      }
    }
    // Handle spaces
    else if (char === ' ' && !inQuote) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    }
    // Regular character
    else {
      current += char;
    }
  }

  // Add last token
  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse a command string into flags, prompt, and slash command
 *
 * @param {string} text - Command text to parse (without /command prefix)
 * @returns {Object} Parsed command with structure:
 *   {
 *     flags: [{name: string, value: string|boolean}],
 *     prompt: string,
 *     slashCommand: string|null,
 *     args: string[]
 *   }
 *
 * @example
 * parseCommand("--model opus Hello")
 * // Returns: { flags: [{name: 'model', value: 'opus'}], prompt: 'Hello', slashCommand: null, args: [] }
 *
 * @example
 * parseCommand("/review-pr 123")
 * // Returns: { flags: [], prompt: '', slashCommand: '/review-pr', args: ['123'] }
 *
 * @example
 * parseCommand("--tools Bash,Read --model sonnet Test this")
 * // Returns: { flags: [{name: 'tools', value: 'Bash,Read'}, {name: 'model', value: 'sonnet'}], prompt: 'Test this', slashCommand: null, args: [] }
 */
export function parseCommand(text) {
  if (!text || typeof text !== 'string') {
    return { flags: [], prompt: '', slashCommand: null, args: [] };
  }

  text = text.trim();

  // Check if this is a slash command
  const slashCommandMatch = text.match(/^(\/[\w-]+)\s*(.*)/);
  if (slashCommandMatch) {
    const slashCommand = slashCommandMatch[1];
    const argsText = slashCommandMatch[2].trim();
    const args = argsText ? tokenize(argsText) : [];

    return {
      flags: [],
      prompt: '',
      slashCommand,
      args
    };
  }

  // Parse flags and prompt
  const tokens = tokenize(text);
  const flags = [];
  let i = 0;

  // Parse flags
  while (i < tokens.length) {
    const token = tokens[i];

    // Check if it's a flag
    if (token.startsWith('--')) {
      const flagName = token;

      // Check if it's a boolean flag
      if (BOOLEAN_FLAGS.includes(flagName)) {
        flags.push({ name: flagName, value: true });
        i++;
      }
      // Flag with value
      else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        flags.push({ name: flagName, value: tokens[i + 1] });
        i += 2;
      }
      // Flag without value (treat as boolean)
      else {
        flags.push({ name: flagName, value: true });
        i++;
      }
    }
    // Not a flag, rest is prompt
    else {
      break;
    }
  }

  // Everything remaining is the prompt
  const prompt = tokens.slice(i).join(' ').trim();

  return {
    flags,
    prompt,
    slashCommand: null,
    args: []
  };
}

/**
 * Validate flags against forbidden list
 *
 * @param {Array<{name: string, value: any}>} flags - Flags to validate
 * @returns {Object} Validation result:
 *   {
 *     valid: boolean,
 *     errors: string[],
 *     warnings: string[]
 *   }
 *
 * @example
 * validateFlags([{name: '--model', value: 'opus'}])
 * // Returns: { valid: true, errors: [], warnings: [] }
 *
 * @example
 * validateFlags([{name: '--session-id', value: '123'}])
 * // Returns: { valid: false, errors: ['--session-id'], warnings: [] }
 */
export function validateFlags(flags) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(flags)) {
    return { valid: true, errors, warnings };
  }

  for (const flag of flags) {
    if (FORBIDDEN_FLAGS.includes(flag.name)) {
      errors.push(flag.name);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get Claude CLI help text by executing `claude --help`
 *
 * @returns {string} Formatted help string with all available flags
 *
 * @example
 * const help = getClaudeHelp();
 * console.log(help);
 */
export function getClaudeHelp() {
  try {
    // Execute claude --help and capture output
    const helpOutput = execSync('claude --help', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return helpOutput.trim();
  } catch (error) {
    console.error('❌ Error getting Claude help:', error.message);

    // Return fallback help text
    return `Claude Code CLI

Usage: claude [options] [prompt]

Common Options:
  --model <model>           Model to use (sonnet, opus, haiku)
  --tools <tools>           Comma-separated list of tools to enable
  --permissions <mode>      Permission mode (strict, relaxed, skip)
  --continue               Continue from last conversation
  --fork-session           Fork current session into new conversation
  --help                   Show help information
  --version                Show version number

Note: Execute 'claude --help' in terminal for complete documentation.`;
  }
}

/**
 * Check if text contains a slash command
 *
 * @param {string} text - Text to check
 * @returns {Object} Slash command info:
 *   {
 *     isSlashCommand: boolean,
 *     command: string,
 *     args: string[]
 *   }
 *
 * @example
 * parseSlashCommand("/review-pr 123")
 * // Returns: { isSlashCommand: true, command: '/review-pr', args: ['123'] }
 *
 * @example
 * parseSlashCommand("--model opus test")
 * // Returns: { isSlashCommand: false, command: '', args: [] }
 */
export function parseSlashCommand(text) {
  if (!text || typeof text !== 'string') {
    return { isSlashCommand: false, command: '', args: [] };
  }

  text = text.trim();

  const match = text.match(/^(\/[\w-]+)\s*(.*)/);
  if (match) {
    const command = match[1];
    const argsText = match[2].trim();
    const args = argsText ? tokenize(argsText) : [];

    return {
      isSlashCommand: true,
      command,
      args
    };
  }

  return {
    isSlashCommand: false,
    command: '',
    args: []
  };
}

// ============================
// EXPORTS
// ============================
export default {
  parseCommand,
  validateFlags,
  getClaudeHelp,
  parseSlashCommand
};
