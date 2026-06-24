/**
 * Test Fixtures
 *
 * Reusable test data for consistent testing across the suite.
 */

export const testUser = {
  email: 'test@fringeisland.com',
  password: 'Test123!@#$',
  displayName: 'Test User',
};

export const testUser2 = {
  email: 'test2@fringeisland.com',
  password: 'Test456!@#$',
  displayName: 'Test User 2',
};

export const testGroup = {
  name: 'Test Group',
  description: 'A test group for automated testing',
  label: 'TEST',
  is_public: false,
  show_member_list: true,
};

export const testJourney = {
  title: 'Test Journey',
  description: 'A test journey for automated testing',
  journey_type: 'predefined',
  is_published: true,
  is_public: true,
  estimated_duration_minutes: 60,
  difficulty_level: 'beginner',
  content: {
    version: '1.0',
    structure: 'linear',
    steps: [
      {
        id: 'step_1',
        title: 'Test Step',
        type: 'content',
        duration_minutes: 30,
        required: true,
      },
    ],
  },
};

// Multi-step journey for navigation, progress, resume, and completion tests
export const testJourneyMultiStep = {
  title: 'Test Multi-Step Journey',
  description: 'A multi-step test journey for navigation and progress testing',
  journey_type: 'predefined',
  is_published: true,
  is_public: true,
  estimated_duration_minutes: 155,
  difficulty_level: 'beginner',
  content: {
    version: '1.0',
    structure: 'linear',
    steps: [
      {
        id: 'step_1',
        title: 'Introduction',
        type: 'content',
        duration_minutes: 30,
        required: true,
        description: 'Introduction to the topic',
      },
      {
        id: 'step_2',
        title: 'Core Concepts',
        type: 'content',
        duration_minutes: 30,
        required: true,
        description: 'Foundational concepts',
      },
      {
        id: 'step_3',
        title: 'Practical Exercise',
        type: 'activity',
        duration_minutes: 45,
        required: true,
        description: 'Hands-on practice',
      },
      {
        id: 'step_4',
        title: 'Optional Deep Dive',
        type: 'content',
        duration_minutes: 30,
        required: false,
        description: 'Additional optional content',
      },
      {
        id: 'step_5',
        title: 'Final Assessment',
        type: 'assessment',
        duration_minutes: 20,
        required: true,
        description: 'Assessment to verify understanding',
      },
    ],
  },
};
