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
