import * as React from 'react';
import { MdClose } from 'react-icons/md';
import { styled } from 'styled-components';
import { Button } from './Button';

const Icon = styled.div`
  background-color: transparent;
  color: var(--secondary-text-color);
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  outline: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out;
  &:hover {
    border-color: var(--form-border-color);
    color: var(--text-color);
  }
`;

const Buttons = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
`;

type Properties = {
  text: string;
  type: 'primary' | 'secondary' | 'danger';
  canClose: boolean;
  disabled: boolean;
  onAddClick: () => void;
  onCancel?: () => void;
};

export const AddButton = ({ text, type, canClose, disabled = false, onAddClick, onCancel }: Properties) => {
  return (
    <Buttons
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
      }}
    >
      <Button text={text} type={type} onClick={onAddClick} disabled={disabled} />
      {canClose ? (
        <Icon
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation();
            if (onCancel) {
              onCancel();
            }
          }}
          onDoubleClick={(e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation();
          }}
        >
          <MdClose />
        </Icon>
      ) : (
        <></>
      )}
    </Buttons>
  );
};
