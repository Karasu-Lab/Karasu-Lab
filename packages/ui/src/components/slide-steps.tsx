import * as React from 'react';

import { cn } from '../lib/utils';

interface SlideStepsProps extends React.ComponentProps<'div'> {
  /** Index of the step currently shown; the track slides to it. */
  index: number;
}

/**
 * Horizontally sliding step panels: a clipped viewport whose track holds
 * one full-width panel per step and slides between them. The motion is
 * defined once in the shared base stylesheet (the track's flex layout and
 * transform transition, each panel's full width and no shrinking), so
 * every app that builds a step flow gets the same slide animation.
 */
function SlideSteps({ index, className, children, ...props }: SlideStepsProps) {
  return (
    <div data-slot="slide-steps" className={cn('overflow-hidden', className)} {...props}>
      <div data-slot="slide-steps-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {children}
      </div>
    </div>
  );
}

/** One step panel inside `SlideSteps`. */
function SlideStep({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="slide-step" className={cn(className)} {...props} />;
}

export { SlideSteps, SlideStep };
