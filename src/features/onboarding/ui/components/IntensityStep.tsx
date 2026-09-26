import { memo } from 'react';

import { IntensityGuide } from '@/shared/ui';

import { StepHeading } from './StepHeading';

/**
 * A pager page: the intensity levels, which stagger in once the page is `revealed` (it has been the main
 * page). Memoised, so the other pages changing never re-renders it.
 */
export const IntensityStep = memo(function IntensityStep({
  title,
  body,
  revealed,
}: {
  title: string;
  body: string;
  revealed: boolean;
}) {
  return (
    <>
      <StepHeading title={title} body={body} />
      <IntensityGuide layout="list" cellSize={30} animateIn revealed={revealed} />
    </>
  );
});
