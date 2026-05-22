import { describe, it, expect } from 'vitest';
import { buildInitialKanban } from '../buildInitialKanban';

describe('buildInitialKanban', () => {
  it('creates one empty list per title with a uuid', () => {
    const k = buildInitialKanban(['A', 'B', 'C']);
    expect(k.lists).toHaveLength(3);
    expect(k.lists.map((l) => l.title)).toEqual(['A', 'B', 'C']);
    expect(k.lists[0].cards).toEqual([]);
    expect(typeof k.lists[0].id).toBe('string');
    expect(k.lists[0].id.length).toBeGreaterThan(0);
    expect(new Set(k.lists.map((l) => l.id)).size).toBe(3); // unique ids
  });

  it('initializes archive and settings to defaults', () => {
    const k = buildInitialKanban(['X']);
    expect(k.archive).toEqual({ lists: [], cards: [] });
    expect(k.settings).toEqual({ labels: [] });
  });

  it('falls back to the canonical defaults when titles is empty', () => {
    const k = buildInitialKanban([]);
    expect(k.lists.map((l) => l.title)).toEqual(['Backlog', 'To Do', 'Doing', 'Done']);
  });
});
