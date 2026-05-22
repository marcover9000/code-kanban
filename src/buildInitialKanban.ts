import { type Kanban } from './kanban/models/kanban';
import { uuid } from './kanban/utils';

const DEFAULT_TITLES = ['Backlog', 'To Do', 'Doing', 'Done'];

export function buildInitialKanban(titles: string[]): Kanban {
  let effectiveTitles = titles;
  if (titles.length === 0) {
    console.warn('[Code Kanban] `code-kanban.default-lists` setting is empty; falling back to default columns.');
    effectiveTitles = DEFAULT_TITLES;
  }

  return {
    lists: effectiveTitles.map((title) => ({
      id: uuid(),
      title,
      cards: [],
    })),
    archive: { lists: [], cards: [] },
    settings: { labels: [] },
  };
}
