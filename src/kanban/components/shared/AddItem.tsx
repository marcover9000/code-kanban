import * as React from 'react';
import { MdAdd } from 'react-icons/md';
import { styled } from 'styled-components';
import { AddButton } from './AddButton';
import { Input } from './Input';

const AddItemLabel = styled.div`
  display: flex;
  align-items: center;
  width: var(--list-width);
  height: 40px;
  border-radius: var(--border-radius);
  background-color: transparent;
  border: 1px dashed var(--form-border-color);
  cursor: pointer;
  box-sizing: border-box;
  color: var(--secondary-text-color);
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out,
    background-color 120ms ease-in-out;
  &:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background-color: var(--card-background-color, var(--secondary-background-color));
  }
`;

const AddItemForm = styled.div`
  width: var(--list-width);
  padding: 8px;
  height: 88px;
  background-color: var(--card-background-color, var(--secondary-background-color));
  border: 1px solid var(--form-border-color);
  border-radius: var(--border-radius);
  box-sizing: border-box;
`;

const Label = styled.div`
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: inherit;
`;

const Icon = styled.div`
  color: inherit;
  font-size: 1.3rem;
  margin: 4px 4px 0 0;
`;

type Properties = {
  showInput?: boolean;
  enableContinuousInput?: boolean;
  addText: string;
  placeholder: string;
  type: 'primary' | 'secondary' | 'danger';
  onEnter: (text: string) => void;
};

export const AddItem = ({
  showInput = false,
  enableContinuousInput = false,
  addText,
  placeholder,
  type,
  onEnter,
}: Properties) => {
  const [isAddItem, setIsAddItem] = React.useState(showInput);
  const [name, setName] = React.useState('');
  const [isComposing, setIsComposing] = React.useState(false);
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setIsAddItem(false);
        return;
      }

      if (e.key !== 'Enter' || isComposing) {
        return;
      }

      if (name === '') {
        setName('');
        setIsAddItem(false);
        return;
      }

      onEnter(name);
      setName('');
      setIsAddItem(enableContinuousInput);
    },
    [name, isComposing]
  );

  React.useEffect(() => {
    setIsAddItem(showInput);
  }, [showInput]);

  return isAddItem ? (
    <AddItemForm>
      <Input
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setName(e.target.value);
        }}
        placeholder={placeholder}
        style={{
          width: 'calc(100% - 16px)',
          marginTop: '0',
          marginBottom: '16px',
        }}
        onCompositionStart={() => {
          setIsComposing(true);
        }}
        onCompositionEnd={() => {
          setIsComposing(false);
        }}
        value={name}
        autoFocus={true}
        onKeyDown={handleKeyDown}
      />
      <AddButton
        text={addText}
        type={type}
        canClose={true}
        disabled={false}
        onAddClick={() => {
          onEnter(name);
          setIsAddItem(false);
          setName('');
        }}
        onCancel={() => {
          setIsAddItem(false);
          setName('');
        }}
      />
    </AddItemForm>
  ) : (
    <AddItemLabel
      onClick={() => {
        setIsAddItem(true);
      }}
    >
      <Icon>
        <MdAdd />
      </Icon>
      <Label>{addText}</Label>
    </AddItemLabel>
  );
};
