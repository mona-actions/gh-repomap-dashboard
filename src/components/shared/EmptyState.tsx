import type { ReactNode } from 'react';
import { Blankslate } from '@primer/react/experimental';

interface EmptyStateProps {
  /** Heading text */
  title: string;
  /** Explanatory copy below the heading */
  description: string;
  /** Optional action element (e.g. a Button to upload data) */
  action?: ReactNode;
}

/**
 * Empty state placeholder built on Primer's Blankslate.
 *
 * Use for "No data loaded", "No results match filters", etc.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Blankslate spacious border>
      <Blankslate.Heading>{title}</Blankslate.Heading>
      <Blankslate.Description>{description}</Blankslate.Description>
      {action}
    </Blankslate>
  );
}
