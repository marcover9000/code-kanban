import * as React from 'react';
import { styled } from 'styled-components';
import { type Card } from '../models/kanban';

const Container = styled.div<{ $selected: boolean }>`
  background-color: var(--card-background-color);
  border: 1px solid ${(p) => (p.$selected ? 'var(--primary-color)' : 'var(--form-border-color)')};
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 6px;
  cursor: grab;
  font-size: 0.85rem;
  box-shadow: var(--shadow-sm);
`;

const Title = styled.div`
  color: var(--main-color);
  font-weight: 600;
  margin-bottom: 4px;
  word-break: break-word;
`;

const Description = styled.div`
  color: var(--secondary-text-color);
  font-size: 0.75rem;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Labels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`;

const LabelPill = styled.span<{ $color: string }>`
  background-color: ${(p) => p.$color};
  color: white;
  border-radius: 8px;
  font-size: 0.7rem;
  padding: 1px 6px;
`;

const Footer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--secondary-text-color);
`;

type Settings = {
  showDescription: boolean;
  showLabels: boolean;
  showDueDate: boolean;
  showCheckboxCount: boolean;
};

type Props = {
  card: Card;
  selected: boolean;
  settings: Settings;
  onClick: () => void;
};

export const SidebarCard = ({ card, selected, settings, onClick }: Props) => {
  const firstLine = card.description.split('\n')[0] ?? '';
  const totalChecks = card.checkboxes.length;
  const checkedChecks = card.checkboxes.filter((c) => c.checked).length;
  const dueDateLabel = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : undefined;

  return (
    <Container $selected={selected} onClick={onClick}>
      <Title>{card.title}</Title>
      {settings.showDescription && firstLine && <Description>{firstLine}</Description>}
      {settings.showLabels && card.labels.length > 0 && (
        <Labels>
          {card.labels.map((l) => (
            <LabelPill key={l.id} $color={l.color}>
              {l.title}
            </LabelPill>
          ))}
        </Labels>
      )}
      {(settings.showDueDate && dueDateLabel) || (settings.showCheckboxCount && totalChecks > 0) ? (
        <Footer>
          {settings.showDueDate && dueDateLabel && <span>📅 {dueDateLabel}</span>}
          {settings.showCheckboxCount && totalChecks > 0 && (
            <span>
              ☑ {checkedChecks}/{totalChecks}
            </span>
          )}
        </Footer>
      ) : null}
    </Container>
  );
};
