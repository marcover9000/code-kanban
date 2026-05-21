import * as React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { styled } from 'styled-components';
import { type List, type Card } from '../models/kanban';
import { SidebarCard } from './SidebarCard';
import { Input } from './shared/Input';

const Container = styled.div<{ $accentColor: string; $isDraggingOver: boolean }>`
  background-color: var(--list-background-color);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 10px;
  border-left: 3px solid ${(p) => p.$accentColor};
  box-shadow: ${(p) => (p.$isDraggingOver ? `inset 0 0 0 2px ${p.$accentColor}` : 'none')};
  transition: box-shadow 120ms ease-in-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  margin-bottom: 6px;
`;

const TitleWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${(p) => p.$color};
  flex-shrink: 0;
`;

const Title = styled.div`
  font-weight: 700;
  color: var(--main-color);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Count = styled.span`
  color: var(--secondary-text-color);
  margin-left: 6px;
  font-weight: 400;
`;

const Toggle = styled.span`
  color: var(--secondary-text-color);
  user-select: none;
`;

const Cards = styled.div`
  min-height: 24px;
`;

const AddRow = styled.div`
  margin-top: 4px;
`;

const AddButton = styled.button`
  width: 100%;
  background: transparent;
  border: 1px dashed var(--secondary-text-color);
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: var(--secondary-text-color);
  font-size: 0.8rem;
  &:hover {
    background-color: var(--card-background-color);
  }
`;

type CardSettings = {
  showDescription: boolean;
  showLabels: boolean;
  showDueDate: boolean;
  showCheckboxCount: boolean;
};

type Props = {
  list: List;
  collapsed: boolean;
  onToggleCollapse: () => void;
  cardSettings: CardSettings;
  selectedCardId: string | undefined;
  onSelectCard: (id: string) => void;
  onAddCard: (title: string) => void;
};

export const SidebarList = ({
  list,
  collapsed,
  onToggleCollapse,
  cardSettings,
  selectedCardId,
  onSelectCard,
  onAddCard,
}: Props) => {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const submit = () => {
    if (draft.trim().length > 0) {
      onAddCard(draft.trim());
    }

    setDraft('');
    setAdding(false);
  };

  const accentColor = list.color ?? 'var(--primary-color)';

  return (
    <Droppable droppableId={list.id} type="cards">
      {(provided, snapshot) => (
        <Container $accentColor={accentColor} $isDraggingOver={snapshot.isDraggingOver}>
          <Header onClick={onToggleCollapse}>
            <TitleWrap>
              <Dot $color={accentColor} />
              <Title>
                {list.title}
                <Count>({list.cards.length})</Count>
              </Title>
            </TitleWrap>
            <Toggle>{collapsed ? '▸' : '▾'}</Toggle>
          </Header>
          <Cards
            {...provided.droppableProps}
            ref={provided.innerRef}
            style={{ display: collapsed ? 'none' : 'block' }}
          >
            {list.cards.map((c: Card, index: number) => (
              <Draggable key={c.id} draggableId={c.id} index={index}>
                {(p) => (
                  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                    <SidebarCard
                      card={c}
                      selected={c.id === selectedCardId}
                      settings={cardSettings}
                      onClick={() => {
                        onSelectCard(c.id);
                      }}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Cards>
          {!collapsed && (
            <>
              <AddRow>
            {adding ? (
              <Input
                autoFocus
                value={draft}
                placeholder="Card title…"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDraft(e.target.value);
                }}
                onBlur={submit}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') submit();
                  if (e.key === 'Escape') {
                    setDraft('');
                    setAdding(false);
                  }
                }}
              />
            ) : (
              <AddButton
                onClick={() => {
                  setAdding(true);
                }}
              >
                + Add card
              </AddButton>
            )}
          </AddRow>
        </>
      )}
        </Container>
      )}
    </Droppable>
  );
};
