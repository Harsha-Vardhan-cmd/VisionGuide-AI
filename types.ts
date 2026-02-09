
export enum HazardRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum GuidanceType {
  HAZARD = 'hazard',
  NAVIGATION = 'navigation',
  INFO = 'info'
}

export enum Direction {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
  UNKNOWN = 'unknown'
}

export enum Distance {
  NEAR = 'near',
  MEDIUM = 'medium',
  FAR = 'far',
  UNKNOWN = 'unknown'
}

export enum SuggestedAction {
  STOP = 'stop',
  SLOW = 'slow',
  STEP_LEFT = 'step_left',
  STEP_RIGHT = 'step_right',
  PROCEED = 'proceed',
  UNKNOWN = 'unknown'
}

export interface GuidanceItem {
  priority: number;
  type: GuidanceType;
  message: string;
  direction: Direction;
  distance: Distance;
  action: SuggestedAction;
  confidence: number;
}

export interface GeminiVisionResponse {
  timestamp: string;
  overall_risk: HazardRisk;
  guidance: GuidanceItem[];
  dont_repeat_for_seconds: number;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  risk: HazardRisk;
}
