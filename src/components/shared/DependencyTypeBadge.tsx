import { Label, type LabelColorOptions } from '@primer/react';
import {
  PackageIcon,
  WorkflowIcon,
  PlayIcon,
  FileCodeIcon,
  ContainerIcon,
  GlobeIcon,
  TerminalIcon,
  type Icon,
} from '@primer/octicons-react';

export type DependencyType =
  | 'package'
  | 'workflow'
  | 'action'
  | 'submodule'
  | 'docker'
  | 'terraform'
  | 'script';

interface DependencyTypeBadgeProps {
  /** The type of dependency to display */
  type: DependencyType;
}

interface BadgeConfig {
  label: string;
  variant: LabelColorOptions;
  icon: Icon;
}

const BADGE_CONFIG: Record<DependencyType, BadgeConfig> = {
  package: { label: 'Package', variant: 'accent', icon: PackageIcon },
  workflow: { label: 'Workflow', variant: 'done', icon: WorkflowIcon },
  action: { label: 'Action', variant: 'success', icon: PlayIcon },
  submodule: { label: 'Submodule', variant: 'secondary', icon: FileCodeIcon },
  docker: { label: 'Docker', variant: 'severe', icon: ContainerIcon },
  terraform: { label: 'Terraform', variant: 'attention', icon: GlobeIcon },
  script: { label: 'Script', variant: 'primary', icon: TerminalIcon },
};

/**
 * Coloured label badge indicating the type of dependency relationship.
 *
 * Each dependency type maps to a distinct Primer Label colour and Octicon.
 */
export function DependencyTypeBadge({ type }: DependencyTypeBadgeProps) {
  const { label, variant, icon: IconComponent } = BADGE_CONFIG[type];

  return (
    <Label variant={variant} size="small">
      <IconComponent size={12} />
      {` ${label}`}
    </Label>
  );
}
