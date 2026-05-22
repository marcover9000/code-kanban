import * as React from 'react';
import { styled } from 'styled-components';
import { selectors } from '../store';

const Items = styled.div`
  box-shadow: var(--shadow-sm);
  background-color: var(--primary-background-color);
  border: 1px solid var(--form-border-color);
  width: 192px;
  position: absolute;
  font-size: 0.9rem;
  border-radius: 8px;
  z-index: 100;
  top: 24px;
  right: -172px;
  padding: 8px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`;

const Label = styled.div`
  color: var(--secondary-text-color);
  font-size: 0.75rem;
  padding: 0 2px;
`;

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid ${(p) => (p.$selected ? 'var(--text-color)' : 'transparent')};
  background-color: ${(p) => p.$color};
  cursor: pointer;
  padding: 0;
  outline: none;
  &:hover {
    transform: scale(1.1);
  }
`;

const ClearButton = styled.button`
  background: transparent;
  border: 1px dashed var(--form-border-color);
  border-radius: 4px;
  padding: 4px 6px;
  margin-top: 8px;
  width: 100%;
  cursor: pointer;
  color: var(--secondary-text-color);
  font-size: 0.75rem;
  &:hover {
    background-color: var(--hover-color);
  }
`;

export const PRESET_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Gray', hex: '#9CA3AF' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
];

type Props = {
  menuId: string;
  currentColor: string | undefined;
  onPick: (color: string | undefined) => void;
};

export const ColorPicker = ({ menuId, currentColor, onPick }: Props) => {
  const activeMenuId = selectors.useMenu();
  if (activeMenuId !== menuId) {
    return null;
  }

  return (
    <Items
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
      }}
    >
      <Label>Column color</Label>
      <Row>
        {PRESET_COLORS.map((c) => (
          <Swatch
            key={c.hex}
            $color={c.hex}
            $selected={currentColor === c.hex}
            title={c.name}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onPick(c.hex);
            }}
          />
        ))}
      </Row>
      <ClearButton
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onPick(undefined);
        }}
      >
        Reset to default
      </ClearButton>
    </Items>
  );
};
