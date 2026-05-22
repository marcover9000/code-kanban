import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureGitignoreEntry } from '../ensureGitignoreEntry';

describe('ensureGitignoreEntry', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cgk-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates .gitignore with the pattern if no file exists', async () => {
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toContain('*.kanban');
    expect(content).toContain('# Code Kanban');
  });

  it('appends the pattern to an existing .gitignore', async () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toContain('node_modules');
    expect(content).toContain('*.kanban');
  });

  it('does not duplicate the pattern if already present', async () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n*.kanban\n');
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    const occurrences = content.match(/\*\.kanban/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it('ensures a trailing newline before appending', async () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules'); // no trailing newline
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toMatch(/node_modules\n.*\*\.kanban/s);
  });

  it('treats lines with surrounding whitespace as a match', async () => {
    writeFileSync(join(dir, '.gitignore'), '  *.kanban  \n');
    await ensureGitignoreEntry(dir, '*.kanban');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    const occurrences = content.match(/\*\.kanban/g) ?? [];
    expect(occurrences.length).toBe(1);
  });
});
