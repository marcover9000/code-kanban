import { format } from 'date-fns/format';
import * as React from 'react';
import { Input } from './Input';

type Props = {
  value?: Date;
  onChange: (date?: Date) => void;
};

export const DatePicker = ({ value, onChange }: Props) => {
  const date = React.useMemo(() => {
    try {
      return value ? format(value, 'yyyy-MM-dd') : undefined;
    } catch {
      return format(new Date(), 'yyyy-MM-dd');
    }
  }, [value]);

  return (
    <Input
      type="date"
      lang={navigator.language}
      style={{ width: '100%' }}
      value={date}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.target.value === '') {
          onChange(undefined);
        } else {
          try {
            onChange(new Date(Date.parse(e.target.value)));
          } catch {
            onChange(undefined);
          }
        }
      }}
      onClick={(e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
      }}
    />
  );
};
