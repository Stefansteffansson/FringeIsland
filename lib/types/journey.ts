// Journey-related TypeScript types for FringeIsland

export type JourneyType = 'predefined' | 'user_created' | 'dynamic';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type StepType = 'content' | 'activity' | 'assessment';

// Journey content step structure
export interface JourneyStep {
  id: string;
  title: string;
  type: StepType;
  duration_minutes: number;
  required: boolean;
  content?: Record<string, unknown>;
}

// Journey content structure (stored in JSONB)
export interface JourneyContent {
  version: string;
  structure: 'linear' | 'branching' | 'adaptive';
  steps: JourneyStep[];
  resources?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

// Main Journey entity (matches database table)
export interface Journey {
  id: string;
  title: string;
  description: string | null;
  created_by_user_id: string;
  is_published: boolean;
  is_public: boolean;
  journey_type: JourneyType;
  content: JourneyContent;
  estimated_duration_minutes: number | null;
  difficulty_level: DifficultyLevel | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

// Journey with creator information (for displays)
export interface JourneyWithCreator extends Journey {
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Journey card data (for catalog display)
export interface JourneyCard {
  id: string;
  title: string;
  description: string | null;
  difficulty_level: DifficultyLevel | null;
  estimated_duration_minutes: number | null;
  tags: string[] | null;
  is_published: boolean;
  is_public: boolean;
  journey_type: JourneyType;
}

// Journey enrollment status types
export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'frozen';

// Journey enrollment entity
export interface JourneyEnrollment {
  id: string;
  journey_id: string;
  user_id: string | null;
  group_id: string | null;
  enrolled_by_user_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  status_changed_at: string;
  completed_at: string | null;
  progress_data: Record<string, unknown>;
}

// Journey filters for catalog
export interface JourneyFilters {
  search?: string;
  difficulty?: DifficultyLevel | 'all';
  tags?: string[];
  minDuration?: number;
  maxDuration?: number;
}

// Journey sort options
export type JourneySortOption = 'newest' | 'oldest' | 'title' | 'duration' | 'difficulty';

// Journey enrollment with full journey data (for My Journeys page)
export interface EnrollmentWithJourney extends JourneyEnrollment {
  journey: {
    id: string;
    title: string;
    description: string | null;
    difficulty_level: DifficultyLevel | null;
    estimated_duration_minutes: number | null;
  };
  group?: {
    id: string;
    name: string;
  };
}
