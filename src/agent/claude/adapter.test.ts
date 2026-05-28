import { describe, expect, it } from 'vitest';
import { buildClaudeArgs } from './adapter';

describe('buildClaudeArgs', () => {
  it('runs in print + stream-json mode', () => {
    const args = buildClaudeArgs({ prompt: 'hi' });
    expect(args.slice(0, 2)).toEqual(['-p', 'hi']);
    expect(args).toContain('--output-format');
    expect(args[args.indexOf('--output-format') + 1]).toBe('stream-json');
  });

  it('resumes by session id when given', () => {
    const args = buildClaudeArgs({ prompt: 'x', sessionId: 'sess-1' });
    const i = args.indexOf('--resume');
    expect(args[i + 1]).toBe('sess-1');
  });

  it('passes the model via --model', () => {
    const args = buildClaudeArgs({ prompt: 'x', model: 'opus' });
    expect(args[args.indexOf('--model') + 1]).toBe('opus');
  });

  it('passes --effort when configured', () => {
    const args = buildClaudeArgs({ prompt: 'x' }, { effort: 'medium' });
    const i = args.indexOf('--effort');
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toBe('medium');
  });

  it('omits --effort when not configured', () => {
    expect(buildClaudeArgs({ prompt: 'x' })).not.toContain('--effort');
  });
});
