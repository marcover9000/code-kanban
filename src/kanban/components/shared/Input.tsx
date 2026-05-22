import { styled } from 'styled-components';

export const Input = styled.input`
  font-family: var(--font-family);
  outline: none;
  border: 1px solid var(--form-border-color);
  padding: 6px 8px;
  font-size: 0.95rem;
  line-height: 1.3rem;
  color: var(--text-color);
  border-radius: var(--border-radius);
  background-color: var(--card-background-color, var(--secondary-background-color));
  transition: border-color 120ms ease-in-out;
  &:focus {
    border-color: var(--primary-color);
    outline: none;
  }
  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    filter: invert(0.4);
  }
  &::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }
`;
