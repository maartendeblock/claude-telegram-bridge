# Feature: Claude Commands Integration - Status

## Branch Information
- **Branch**: `feature/claudecommands`
- **Based on**: `feature/english` (PR #2 - multilingual support)
- **Status**: 🟡 IN PROGRESS - Not working yet
- **Last Updated**: 2025-11-14

---

## Goal

Add comprehensive Claude Code CLI command integration to the Telegram bot, allowing users to:

1. **Execute any Claude CLI command** with custom flags via `/command`
2. **Use quick shortcuts**: `/model`, `/resume`, `/continue`, `/tools`, `/permissions`
3. **Discover and execute custom slash commands** from `.claude/commands/` folder
4. **View all Claude CLI options** with `/command --help`

---

## What Has Been Implemented

### ✅ Completed Components

#### 1. Core Infrastructure
- **`lib/commandParser.js`** (309 lines) - Command parsing and validation
  - Parses command strings into flags, prompts, and slash commands
  - Validates flags against forbidden list
  - Handles quoted strings, boolean flags, comma-separated values
  - Security: Blocks forbidden flags (--session-id, --input-format, etc.)

- **`lib/sessionManager.js`** (287 lines) - Session preferences management
  - Stores user preferences (model, tools, permissions)
  - Persists to `data/session-preferences.json`
  - Auto-loads on startup, auto-saves on changes
  - Memory management (10k entry limit)

#### 2. Command Handlers (in index.js)

All handlers added at lines 712-1015:

- **`/command <flags> <prompt>`** (lines 712-823)
  - Direct CLI execution with custom flags
  - Slash command execution
  - Help system with Claude CLI documentation

- **`/model [sonnet|opus|haiku]`** (lines 825-868)
  - Switch AI models
  - Auto-restart sessions with new model

- **`/resume <session-id>`** (lines 870-898)
  - Resume previous conversations

- **`/continue`** (lines 900-919)
  - Continue most recent conversation

- **`/tools [list|enable|disable]`** (lines 921-974)
  - Manage available tools
  - Enable/disable specific tools
  - Auto-restart with new tool configuration

- **`/permissions [strict|relaxed|skip]`** (lines 976-1015)
  - Control permission approval mode
  - Auto-restart with new permission mode

#### 3. Helper Functions

- **`discoverCustomCommands()`** (lines 90-107)
  - Scans `.claude/commands/` folder for custom commands
  - Returns list of available slash commands

- **`createClaudeSessionWithFlags(chatId, customFlags)`** (lines 113-179)
  - Creates Claude session with custom CLI flags
  - Used by `/command`, `/resume`, `/continue`

- **Updated `createClaudeSession()`** (lines 181-234)
  - Now uses session preferences
  - Dynamically builds args based on saved preferences (model, tools, permissions)

#### 4. Translations

All commands translated to 3 languages in:
- `locales/en.json`
- `locales/pt.json`
- `locales/nl.json`

Translation keys added:
- `commands.command.*` (help, usage, messages)
- `commands.model.*`
- `commands.resume.*`
- `commands.continue.*`
- `commands.tools.*`
- `commands.permissions.*`

#### 5. Tests

- **`test/commandParser.test.js`** - 28 unit tests
  - All tests passing (37 total including i18n tests)
  - Tests command parsing, validation, slash command detection

#### 6. Documentation

- Updated `README.md`, `README.en.md`, `README.nl.md` with advanced commands section
- Shows usage examples for all new commands

---

## Known Issues / Not Working

### 🔴 Critical Issues

**The feature is implemented but not working correctly. Issues to debug:**

1. **`/command` execution may be failing**
   - Needs testing with actual bot running
   - Flag parsing might have issues
   - Session creation with custom flags may not work properly

2. **Potential issues to investigate**:
   - How custom flags are passed to Claude CLI spawn
   - Whether `createClaudeSessionWithFlags()` properly spawns Claude
   - If slash command detection and execution works
   - Session restart logic on preference changes

3. **User reported**: "it's not working"
   - Need to test actual Telegram bot behavior
   - Check logs for errors
   - Verify command handlers are being called

---

## Testing Checklist (TODO)

### Manual Testing Needed

- [ ] Start bot with `npm start`
- [ ] Send `/command --help` - verify help is displayed
- [ ] Send `/model` - verify current model shown
- [ ] Send `/model opus` - verify session restarts with opus
- [ ] Send `/resume <session-id>` - verify resume works
- [ ] Send `/continue` - verify continue works
- [ ] Send `/tools list` - verify tools are listed
- [ ] Send `/tools enable Bash,Read` - verify tools restriction works
- [ ] Send `/permissions relaxed` - verify permission mode changes
- [ ] Send `/command --model opus "write a poem"` - verify custom flags work
- [ ] Check if custom slash commands are discovered from `.claude/commands/`

### Debug Steps

1. **Enable verbose logging** - Check what's being passed to Claude CLI
2. **Test `createClaudeSessionWithFlags()`** - Ensure it spawns correctly
3. **Verify flag building** - Ensure `--` prefix is added (fixed in commit cc1adee)
4. **Check error messages** - Look for crashes or exceptions
5. **Validate session lifecycle** - Ensure old sessions are killed before new ones start

---

## Code Structure

### File Organization

```
lib/
  ├── commandParser.js        # Parse and validate commands
  ├── sessionManager.js       # Manage session preferences
  └── i18n.js                 # Translation system (existing)

locales/
  ├── en.json                 # English translations
  ├── pt.json                 # Portuguese translations
  └── nl.json                 # Dutch translations

test/
  ├── commandParser.test.js   # Command parser tests
  └── i18n.test.js           # i18n tests (existing)

data/
  ├── language-preferences.json    # Language settings (existing)
  └── session-preferences.json     # Session settings (new)

index.js                      # Main bot with command handlers
```

### Key Functions in index.js

| Function | Lines | Purpose |
|----------|-------|---------|
| `discoverCustomCommands()` | 90-107 | Find custom slash commands |
| `createClaudeSessionWithFlags()` | 113-179 | Spawn Claude with custom flags |
| `createClaudeSession()` | 181-234 | Spawn Claude with preferences |
| `/command` handler | 712-823 | Execute CLI commands |
| `/model` handler | 825-868 | Switch models |
| `/resume` handler | 870-898 | Resume sessions |
| `/continue` handler | 900-919 | Continue conversations |
| `/tools` handler | 921-974 | Manage tools |
| `/permissions` handler | 976-1015 | Control permissions |

---

## Technical Details

### Security - Forbidden Flags

These flags are blocked from user override:
- `--session-id` (managed by bot)
- `--input-format` (fixed to stream-json)
- `--output-format` (fixed to stream-json)
- `--print` (always enabled)
- `--verbose` (always enabled)
- `--replay-user-messages` (always enabled)
- `--include-partial-messages` (always enabled)

### Session Preferences Format

Stored in `data/session-preferences.json`:

```json
{
  "123456789": {
    "model": "opus",
    "tools": "Bash,Read,Write",
    "permissions": "relaxed"
  },
  "-987654321": {
    "model": "sonnet",
    "disabledTools": "WebSearch"
  }
}
```

### Command Parsing Examples

```javascript
// Input: "/command --model opus Hello"
// Output: { flags: [{name: 'model', value: 'opus'}], prompt: 'Hello' }

// Input: "/command /review-pr 123"
// Output: { slashCommand: '/review-pr', args: ['123'] }

// Input: "/command --continue"
// Output: { flags: [{name: 'continue', value: true}], prompt: '' }
```

---

## Dependencies on Other Features

### Required PRs

⚠️ **This feature depends on PR #2 (multilingual support)**

Must be merged in this order:
1. PR #2 (`feature/english`) - Multilingual support
2. This PR (`feature/claudecommands`) - Claude commands

If PR #2 is not merged first, this feature will have merge conflicts.

---

## Commits

### Main Implementation
- `2cff1b3` - "Add Claude CLI command integration with shortcuts"
  - Initial implementation of all features
  - Command parser, session manager, handlers, tests, docs

### Bug Fixes
- `cc1adee` - "Fix /command flag prefix bug and update start message"
  - Fixed missing `--` prefix on flags (line 790)
  - Updated start message to show `/command`

---

## Next Steps to Complete This Feature

### Immediate (Debug Current Issues)

1. **Test with actual bot running**
   - Start bot: `npm start`
   - Try each command and document what fails
   - Check console logs for errors

2. **Debug `/command` execution**
   - Add more logging to see what's being passed to Claude
   - Verify `createClaudeSessionWithFlags()` is called correctly
   - Check if Claude process spawns successfully

3. **Verify session lifecycle**
   - Ensure old sessions are properly killed
   - Verify new sessions start with correct flags
   - Check if auto-restart logic works

4. **Test custom slash commands**
   - Create test command in `.claude/commands/test.md`
   - Run `/command /test` and see if it's discovered and executed

### Follow-up (After Basic Functionality Works)

5. **Add more error handling**
   - Better error messages for users
   - Handle Claude CLI errors gracefully
   - Validate session state before operations

6. **Performance testing**
   - Test with multiple users
   - Verify session preference persistence
   - Check memory usage with many sessions

7. **User experience improvements**
   - Add inline keyboard buttons for common operations
   - Session browser UI for `/resume`
   - Better help text formatting

---

## How to Test Locally

### Setup

1. Ensure `.env` is configured with:
   ```env
   TELEGRAM_BOT_TOKEN=your_token
   AUTHORIZED_CHAT_ID=your_chat_id
   WORKING_DIR=C:\your\project
   CLAUDE_CODE_PATH=claude
   DEFAULT_LANGUAGE=en
   ```

2. Make sure you're on the right branch:
   ```bash
   git checkout feature/claudecommands
   ```

3. Install dependencies (if needed):
   ```bash
   npm install
   ```

### Run Tests

```bash
npm test  # Should show 37 tests passing
```

### Run Bot

```bash
npm start
```

### Test Commands

1. Start a session: `/start`
2. Try help: `/command --help`
3. Try model switch: `/model opus`
4. Try custom command: `/command --model haiku "write a haiku"`

---

## Questions to Answer

When resuming this work, investigate:

1. **Why is `/command` not working?**
   - Does it throw an error?
   - Does nothing happen?
   - Does it create a session but not respond?

2. **Are custom flags being passed correctly to Claude CLI?**
   - Add logging to see the exact spawn arguments
   - Verify the command string being executed

3. **Does `createClaudeSessionWithFlags()` work differently than `createClaudeSession()`?**
   - Are there differences in event handling?
   - Is the session being stored in the `sessions` Map?

4. **Do shortcuts work but `/command` doesn't?**
   - Test each shortcut individually
   - Compare working vs non-working handlers

---

## Useful Code Snippets for Debugging

### Add more logging to createClaudeSessionWithFlags()

```javascript
// At line 113 in index.js
function createClaudeSessionWithFlags(chatId, customFlags) {
  console.log(`🔧 [${chatId}] Creating session with flags:`, customFlags);

  // ... existing code ...

  const claudeProcess = spawn(claudeCmd, args, {
    cwd: WORKING_DIR,
    shell: true,
    windowsHide: true
  });

  console.log(`✅ [${chatId}] Spawned Claude with PID:`, claudeProcess.pid);
  console.log(`📋 [${chatId}] Full command:`, claudeCmd, args.join(' '));

  // ... rest of function ...
}
```

### Check if handler is being called

```javascript
// At line 715 in index.js
if (text && text.startsWith('/command')) {
  console.log(`🎯 [${chatId}] /command handler triggered with text:`, text);

  // ... existing code ...
}
```

---

## Contact / Questions

If you're picking this up later and have questions:

1. Review the unit tests in `test/commandParser.test.js` - they show how the parser should work
2. Check the translation files to see what messages are available
3. Look at the PRD-MULTILINGUAL.md (if it exists) for context on the previous feature
4. Review the git log: `git log --oneline feature/claudecommands`

---

**Last Updated**: 2025-11-14
**Status**: 🟡 IN PROGRESS - Implementation complete, debugging needed
**Next Action**: Test with actual bot and debug why `/command` isn't working
