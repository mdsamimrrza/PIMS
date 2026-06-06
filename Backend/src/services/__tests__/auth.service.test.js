const { authenticateUser } = require('../auth.service');
const User = require('../../models/User.model');
const { hashPassword } = require('../../utils/password');

describe('Auth Service', () => {
  describe('authenticateUser', () => {
    it('should throw an error for non-existent user', async () => {
      await expect(authenticateUser({ email: 'fake@example.com', password: 'password123' }))
        .rejects
        .toThrow('Invalid email or password');
    });

    it('should throw an error for locked user', async () => {
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'locked@example.com',
        passwordHash: hashPassword('password123'),
        role: 'admin',
        isActive: true,
        lockUntil: new Date(Date.now() + 1000000)
      });

      await expect(authenticateUser({ email: 'locked@example.com', password: 'password123' }))
        .rejects
        .toThrow('Account temporarily locked due to too many failed login attempts. Please try again later.');
    });

    it('should authenticate a valid user', async () => {
      const user = await User.create({
        firstName: 'Valid',
        lastName: 'User',
        email: 'valid@example.com',
        passwordHash: hashPassword('password123'),
        role: 'admin',
        isActive: true
      });

      const result = await authenticateUser({ email: 'valid@example.com', password: 'password123' });
      // expect(result).toHaveProperty('token') // Session based auth doesn't return token
      expect(result.user).toHaveProperty('email', 'valid@example.com');
    });
  });
});
