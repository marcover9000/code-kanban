import * as React from 'react';
import { DragDropContext, type DropResult } from 'react-beautiful-dnd';
import { styled } from 'styled-components';
import { SidebarList } from '../components/SidebarList';
import { type Card } from '../models/kanban';
import { selectors, kanbanActions } from '../store';
import { vscode } from '../../vscode';
import { uuid } from '../utils';

const Container = styled.div`
  padding: 8px;
  background-color: var(--main-background-color);
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--secondary-text-color);
`;

const CreateButton = styled.button`
  background-color: var(--main-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 600;
  &:hover {
    opacity: 0.85;
  }
`;

type Settings = {
  showDescription: boolean;
  sidebarShowLabels: boolean;
  sidebarShowDueDate: boolean;
  sidebarShowCheckboxCount: boolean;
  collapsedLists: Record<string, boolean>;
};

const getSettings = (): Settings => {
  const w = window as unknown as { settings?: Settings };
  return {
    showDescription: w.settings?.showDescription ?? true,
    sidebarShowLabels: w.settings?.sidebarShowLabels ?? true,
    sidebarShowDueDate: w.settings?.sidebarShowDueDate ?? true,
    sidebarShowCheckboxCount: w.settings?.sidebarShowCheckboxCount ?? true,
    collapsedLists: w.settings?.collapsedLists ?? {},
  };
};

export const SidebarBoard = () => {
  const kanban = selectors.useKanban();
  const lists = selectors.useLists();
  const moveCard = kanbanActions.useMoveCard();
  const moveCardAcrossList = kanbanActions.useMoveCardAcrossList();
  const addCards = kanbanActions.useAddCards();
  const initialSettings = React.useMemo(getSettings, []);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(initialSettings.collapsedLists);
  const [selectedCardId, setSelectedCardId] = React.useState<string | undefined>(undefined);

  const cardSettings = React.useMemo(
    () => ({
      showDescription: initialSettings.showDescription,
      showLabels: initialSettings.sidebarShowLabels,
      showDueDate: initialSettings.sidebarShowDueDate,
      showCheckboxCount: initialSettings.sidebarShowCheckboxCount,
    }),
    [initialSettings]
  );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !kanban) return;
    if (result.type !== 'cards') return;
    if (result.source.droppableId === result.destination.droppableId) {
      moveCard(result.source.droppableId, result.source.index, result.destination.index);
    } else {
      moveCardAcrossList(
        result.source.droppableId,
        result.source.index,
        result.destination.droppableId,
        result.destination.index
      );
    }
  };

  const toggleCollapse = (listId: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [listId]: !prev[listId] };
      vscode.postMessage({ type: 'set-collapse-state', collapsedLists: next });
      return next;
    });
  };

  if (lists.length === 0) {
    return (
      <Container>
        <EmptyState>
          <div>No kanban yet.</div>
          <CreateButton
            onClick={() => {
              vscode.postMessage({ type: 'create-todo-kanban' });
            }}
          >
            Create todo kanban
          </CreateButton>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <DragDropContext onDragEnd={onDragEnd}>
        {lists.map((l) => (
          <SidebarList
            key={l.id}
            list={l}
            collapsed={Boolean(collapsed[l.id])}
            onToggleCollapse={() => {
              toggleCollapse(l.id);
            }}
            cardSettings={cardSettings}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            onAddCard={(title: string) => {
              const newCard: Card = {
                id: uuid(),
                listId: l.id,
                title,
                description: '',
                dueDate: undefined,
                labels: [],
                checkboxes: [],
                comments: [],
              };
              addCards(l, [newCard]);
            }}
          />
        ))}
      </DragDropContext>
    </Container>
  );
};
