/**
 * Setup Verification Test
 *
 * This test verifies that Jest is configured correctly.
 * If this test passes, the testing infrastructure is working.
 */

describe('Jest Configuration', () => {
  it('should be configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should have access to test fixtures', () => {
    const { testUser } = require('./helpers/fixtures');
    expect(testUser).toBeDefined();
    expect(testUser.email).toBe('test@fringeisland.com');
  });

  it('should support TypeScript', () => {
    const greeting: string = 'Hello, Jest!';
    expect(greeting).toContain('Jest');
  });

  it('should support async/await', async () => {
    const promise = Promise.resolve('Success');
    const result = await promise;
    expect(result).toBe('Success');
  });
});
