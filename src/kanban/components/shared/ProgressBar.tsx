import * as React from 'react';
import { styled } from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 6px 0;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--secondary-text-color);
`;

const Track = styled.div`
  position: relative;
  width: 100%;
  height: 8px;
  background-color: var(--form-border-color);
  border-radius: 4px;
  overflow: hidden;
`;

const Fill = styled.div<{ $progress: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({$progress}) => `${Number.isNaN($progress) ? 0 : Math.min(100, Math.max(0, $progress))}%`};
  background-color: var(--primary-color);
  transition: width 160ms ease-in-out;
`;

type Props = {
  progress: number;
};

export const ProgressBar = ({progress}: Props) => {
  const clamped = Number.isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress));
  return (
    <Wrapper>
      <TopRow>
        <span>Progress</span>
        <span>{Math.round(clamped)}%</span>
      </TopRow>
      <Track>
        <Fill $progress={clamped} />
      </Track>
    </Wrapper>
  );
};
