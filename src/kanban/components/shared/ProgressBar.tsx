import * as React from 'react';
import { styled } from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  margin: 6px 0;
`;

const Track = styled.div`
  position: relative;
  width: 100%;
  height: 18px;
  background-color: var(--form-border-color);
  border-radius: 9px;
  overflow: hidden;
`;

const Fill = styled.div<{ $progress: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({$progress}) => `${Number.isNaN($progress) ? 0 : Math.min(100, Math.max(0, $progress))}%`};
  background-color: var(--primary-color);
  transition: width 160ms ease-in-out;
`;

const LabelOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-color);
  pointer-events: none;
  mix-blend-mode: difference;
  /* mix-blend-mode flips luminance against whatever's beneath, so the label
     stays readable both on the filled and unfilled halves of the bar. */
`;

type Props = {
  progress: number;
};

export const ProgressBar = ({progress}: Props) => {
  const clamped = Number.isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress));
  return (
    <Wrapper>
      <Track>
        <Fill $progress={clamped} />
        <LabelOverlay>{Math.round(clamped)}%</LabelOverlay>
      </Track>
    </Wrapper>
  );
};
