import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from './store';

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sess-'));
  path = join(dir, 'sessions.json');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('SessionStore agent-scoped resume', () => {
  it('resumes a session for the same agent + cwd', async () => {
    const s = new SessionStore(path);
    s.set('chat', 'sid-1', '/work', 'claude');
    expect(s.resumeFor('chat', '/work', 'claude')).toBe('sid-1');
    await s.flush();
  });

  it('does NOT resume a session created by a different agent', async () => {
    // The production bug: a Codex thread id must not be handed to Claude.
    const s = new SessionStore(path);
    s.set('chat', '019e6918-codex-uuid', '/work', 'codex');
    expect(s.resumeFor('chat', '/work', 'claude')).toBeUndefined();
    await s.flush();
  });

  it('still refuses to resume across a different cwd', async () => {
    const s = new SessionStore(path);
    s.set('chat', 'sid-1', '/work', 'claude');
    expect(s.resumeFor('chat', '/other', 'claude')).toBeUndefined();
    await s.flush();
  });

  it('treats legacy entries without an agent as non-resumable (safe default)', async () => {
    // Simulate a pre-upgrade sessions.json with no `agent` field.
    const { writeFileSync } = await import('node:fs');
    writeFileSync(
      path,
      JSON.stringify({ chat: { sessionId: 'sid-old', cwd: '/work', updatedAt: Date.now() } }),
    );
    const s = new SessionStore(path);
    await s.load();
    expect(s.resumeFor('chat', '/work', 'claude')).toBeUndefined();
  });

  it('persists and reloads the agent tag', async () => {
    const s = new SessionStore(path);
    s.set('chat', 'sid-1', '/work', 'codex');
    await s.flush();

    const s2 = new SessionStore(path);
    await s2.load();
    expect(s2.resumeFor('chat', '/work', 'codex')).toBe('sid-1');
    expect(s2.resumeFor('chat', '/work', 'claude')).toBeUndefined();
  });
});
