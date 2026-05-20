import { type Kanban } from './kanban/models/kanban';
import { uuid } from './kanban/utils';

const DEFAULT_TITLES = ['Backlog', 'To Do', 'Doing', 'Done'];

export function buildInitialKanban(titles: string[]): Kanban {
  const effectiveTitles = titles.length > 0 ? titles : DEFAULT_TITLES;
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
