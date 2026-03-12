import { Label } from '@primer/react';
import { CheckCircleFillIcon, AlertIcon } from '@primer/octicons-react';

interface ConfidenceIndicatorProps {
  /** Confidence level of the dependency mapping */
  confidence: 'high' | 'low';
}

/**
 * Visual indicator for dependency-mapping confidence level.
 *
 * - **high** → green/success label with a solid check icon
 * - **low**  → yellow/attention label with a warning icon
 */
export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  if (confidence === 'high') {
    return (
      <Label variant="success" size="small">
        <CheckCircleFillIcon size={12} />
        {' High confidence'}
      </Label>
    );
  }

  return (
    <Label variant="attention" size="small">
      <AlertIcon size={12} />
      {' Low confidence'}
    </Label>
  );
}
