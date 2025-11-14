import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseCommand, validateFlags, parseSlashCommand } from '../lib/commandParser.js';

describe('Command Parser', () => {
  describe('parseCommand', () => {
    it('should parse simple command with prompt', () => {
      const result = parseCommand('--model opus Hello');
      assert.strictEqual(result.flags.length, 1);
      assert.strictEqual(result.flags[0].name, '--model');
      assert.strictEqual(result.flags[0].value, 'opus');
      assert.strictEqual(result.prompt, 'Hello');
      assert.strictEqual(result.slashCommand, null);
      assert.deepStrictEqual(result.args, []);
    });

    it('should parse command with multiple flags', () => {
      const result = parseCommand('--model opus --tools Bash,Read Write code');
      assert.strictEqual(result.flags.length, 2);
      assert.strictEqual(result.flags[0].name, '--model');
      assert.strictEqual(result.flags[0].value, 'opus');
      assert.strictEqual(result.flags[1].name, '--tools');
      assert.strictEqual(result.flags[1].value, 'Bash,Read');
      assert.strictEqual(result.prompt, 'Write code');
    });

    it('should parse command with quoted prompt', () => {
      const result = parseCommand('--model opus "Write a poem"');
      assert.strictEqual(result.flags[0].name, '--model');
      assert.strictEqual(result.flags[0].value, 'opus');
      assert.strictEqual(result.prompt, 'Write a poem');
    });

    it('should parse slash command', () => {
      const result = parseCommand('/review-pr 123');
      assert.strictEqual(result.slashCommand, '/review-pr');
      assert.deepStrictEqual(result.args, ['123']);
      assert.strictEqual(result.flags.length, 0);
      assert.strictEqual(result.prompt, '');
    });

    it('should handle boolean flags', () => {
      const result = parseCommand('--continue Write more');
      assert.strictEqual(result.flags[0].name, '--continue');
      assert.strictEqual(result.flags[0].value, true);
      assert.strictEqual(result.prompt, 'Write more');
    });

    it('should parse slash command with multiple args', () => {
      const result = parseCommand('/fix-bug "Memory leak" server.js');
      assert.strictEqual(result.slashCommand, '/fix-bug');
      assert.deepStrictEqual(result.args, ['Memory leak', 'server.js']);
    });

    it('should handle empty input', () => {
      const result = parseCommand('');
      assert.strictEqual(result.flags.length, 0);
      assert.strictEqual(result.prompt, '');
      assert.strictEqual(result.slashCommand, null);
    });

    it('should handle single quotes in prompt', () => {
      const result = parseCommand("--model sonnet 'Hello world'");
      assert.strictEqual(result.prompt, 'Hello world');
    });

    it('should handle flag without value as boolean', () => {
      const result = parseCommand('--help');
      assert.strictEqual(result.flags[0].name, '--help');
      assert.strictEqual(result.flags[0].value, true);
      assert.strictEqual(result.prompt, '');
    });

    it('should handle multiple boolean flags', () => {
      const result = parseCommand('--continue --fork-session Test');
      assert.strictEqual(result.flags.length, 2);
      assert.strictEqual(result.flags[0].name, '--continue');
      assert.strictEqual(result.flags[0].value, true);
      assert.strictEqual(result.flags[1].name, '--fork-session');
      assert.strictEqual(result.flags[1].value, true);
      assert.strictEqual(result.prompt, 'Test');
    });

    it('should handle prompt only (no flags)', () => {
      const result = parseCommand('Just a simple prompt');
      assert.strictEqual(result.flags.length, 0);
      assert.strictEqual(result.prompt, 'Just a simple prompt');
    });

    it('should handle complex quoted strings with spaces', () => {
      const result = parseCommand('--model opus "This is a very long prompt with many spaces"');
      assert.strictEqual(result.prompt, 'This is a very long prompt with many spaces');
    });
  });

  describe('validateFlags', () => {
    it('should accept valid flags', () => {
      const flags = [{ name: '--model', value: 'opus' }];
      const result = validateFlags(flags);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject forbidden flag --session-id', () => {
      const flags = [{ name: '--session-id', value: 'abc' }];
      const result = validateFlags(flags);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('--session-id'));
    });

    it('should reject forbidden flag --input-format', () => {
      const flags = [{ name: '--input-format', value: 'json' }];
      const result = validateFlags(flags);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('--input-format'));
    });

    it('should reject forbidden flag --output-format', () => {
      const flags = [{ name: '--output-format', value: 'text' }];
      const result = validateFlags(flags);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('--output-format'));
    });

    it('should reject multiple forbidden flags', () => {
      const flags = [
        { name: '--session-id', value: 'abc' },
        { name: '--verbose', value: true },
        { name: '--model', value: 'opus' }
      ];
      const result = validateFlags(flags);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errors.length, 2);
      assert.ok(result.errors.includes('--session-id'));
      assert.ok(result.errors.includes('--verbose'));
    });

    it('should accept multiple valid flags', () => {
      const flags = [
        { name: '--model', value: 'opus' },
        { name: '--tools', value: 'Bash,Read' },
        { name: '--continue', value: true }
      ];
      const result = validateFlags(flags);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should handle empty flags array', () => {
      const flags = [];
      const result = validateFlags(flags);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should handle null input gracefully', () => {
      const result = validateFlags(null);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('parseSlashCommand', () => {
    it('should detect slash commands', () => {
      const result = parseSlashCommand('/review-pr 123');
      assert.strictEqual(result.isSlashCommand, true);
      assert.strictEqual(result.command, '/review-pr');
      assert.deepStrictEqual(result.args, ['123']);
    });

    it('should return false for non-slash commands', () => {
      const result = parseSlashCommand('--model opus hello');
      assert.strictEqual(result.isSlashCommand, false);
      assert.strictEqual(result.command, '');
      assert.deepStrictEqual(result.args, []);
    });

    it('should handle slash command without args', () => {
      const result = parseSlashCommand('/help');
      assert.strictEqual(result.isSlashCommand, true);
      assert.strictEqual(result.command, '/help');
      assert.deepStrictEqual(result.args, []);
    });

    it('should handle slash command with multiple args', () => {
      const result = parseSlashCommand('/fix-bug "Memory leak" server.js line-42');
      assert.strictEqual(result.isSlashCommand, true);
      assert.strictEqual(result.command, '/fix-bug');
      assert.strictEqual(result.args.length, 3);
      assert.strictEqual(result.args[0], 'Memory leak');
      assert.strictEqual(result.args[1], 'server.js');
      assert.strictEqual(result.args[2], 'line-42');
    });

    it('should handle slash command with quoted arguments', () => {
      const result = parseSlashCommand('/optimize "main.js" "utils.js"');
      assert.strictEqual(result.isSlashCommand, true);
      assert.strictEqual(result.command, '/optimize');
      assert.deepStrictEqual(result.args, ['main.js', 'utils.js']);
    });

    it('should handle empty input', () => {
      const result = parseSlashCommand('');
      assert.strictEqual(result.isSlashCommand, false);
    });

    it('should handle null input', () => {
      const result = parseSlashCommand(null);
      assert.strictEqual(result.isSlashCommand, false);
    });

    it('should handle slash command with hyphens', () => {
      const result = parseSlashCommand('/review-pull-request 456');
      assert.strictEqual(result.isSlashCommand, true);
      assert.strictEqual(result.command, '/review-pull-request');
      assert.deepStrictEqual(result.args, ['456']);
    });
  });
});
