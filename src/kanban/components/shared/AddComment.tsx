import * as React from 'react';
import { styled } from 'styled-components';

const AddItemForm = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
`;

type Properties = {
  addText: string;
  placeholder: string;
  type: 'primary' | 'secondary' | 'danger';
  onEnter: (text: string) => void;
};

export const AddComment = ({placeholder, onEnter}: Properties) => {
  const [text, setText] = React.useState('');

  const commit = React.useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onEnter(trimmed);
      setText('');
    }
  }, [text, onEnter]);

  return (
    <AddItemForm>
      <textarea
        autoFocus
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setText(e.target.value);
        }}
        onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
          e.currentTarget.style.borderColor = 'var(--primary-color)';
        }}
        onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
          e.currentTarget.style.borderColor = 'var(--form-border-color)';
          commit();
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          // Cmd/Ctrl+Enter posts the comment without waiting for blur,
          // matching the convention in chat apps and code editors.
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          }
        }}
        style={{
          color: 'var(--text-color)',
          backgroundColor: 'var(--card-background-color, var(--secondary-background-color))',
          width: '100%',
          fontFamily: 'var(--font-family)',
          fontSize: '0.95rem',
          lineHeight: '1.4rem',
          minHeight: '72px',
          padding: '8px',
          border: '1px solid var(--form-border-color)',
          borderRadius: 'var(--border-radius)',
          outline: 'none',
          resize: 'vertical',
          transition: 'border-color 120ms ease-in-out',
        }}
        placeholder={placeholder}
        value={text}
      />
    </AddItemForm>
  );
};
