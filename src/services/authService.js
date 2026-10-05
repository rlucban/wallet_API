const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const profileRepository = require('../repositories/profileRepository');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';
const JWT_EXPIRES_IN = '24h';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

const authService = {
  register: async (name, passcode, initialBalance = 0) => {
    try {
      // 1. Check if user exists
      const existingUser = await userRepository.findByName(name);
      if (existingUser) {
        throw new AppError('Email is already registered', 400);
      }

      // 2. Hash passcode
      const salt = await bcrypt.genSalt(10);
      const hashedPasscode = await bcrypt.hash(passcode, salt);

      // 3. Generate a session ID
      const sessionId = crypto.randomUUID();

      // 4. Create user
      const newUser = await userRepository.createUser({
        name,
        passcode: hashedPasscode,
        currentSessionId: sessionId
      });

      if (!newUser) {
        throw new AppError('Failed to create user record in database', 500);
      }

      // 5. Create associated profile
      await profileRepository.createProfile({
        userId: newUser.id,
        name,
        isFirstRun: true,
        initialBalance: initialBalance
      });

      // 6. Generate JWT
      const token = generateToken(newUser.id);

      return {
        user: {
          id: newUser.id,
          name: newUser.name
        },
        token
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Registration failed: ${error.message}`, error.statusCode || 500);
    }
  },

  login: async (name, passcode, deviceId = null, force = false) => {
    try {
      // 1. Find user
      const user = await userRepository.findByName(name);
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // 2. Check passcode
      const isMatch = await bcrypt.compare(passcode, user.passcode);
      if (!isMatch) {
        throw new AppError('Invalid credentials', 401);
      }

      // 3. Check for Session Conflict (Multi-device management)
      // If user is already logged in on a different device AND force is false
      if (deviceId && user.currentSessionId && user.currentSessionId !== deviceId && !force) {
        return {
          sessionConflict: true,
          message: 'User is already logged in on another device'
        };
      }

      // 4. Update session
      const newSessionId = deviceId || crypto.randomUUID();
      await userRepository.updateSessionId(user.id, newSessionId);

      // 5. Return token
      const token = generateToken(user.id);
      
      return {
        sessionConflict: false,
        user: {
          id: user.id,
          name: user.name
        },
        token
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Login failed: ${error.message}`, error.statusCode || 500);
    }
  },

  logout: async (userId) => {
    // clear session ID
    await userRepository.updateSessionId(userId, null);
    return true;
  },

  changePasscode: async (userId, currentPasscode, newPasscode) => {
    try {
      // 1. Load user by id ONLY (never a body-supplied id — no IDOR surface)
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // 2. Verify current passcode
      const isMatch = await bcrypt.compare(currentPasscode, user.passcode);
      if (!isMatch) {
        throw new AppError('Current PIN is incorrect', 401);
      }

      // 3. Hash new passcode (same calls as register)
      const salt = await bcrypt.genSalt(10);
      const hashedPasscode = await bcrypt.hash(newPasscode, salt);

      // 4. Persist + rotate session id
      await userRepository.updatePasscode(user.id, hashedPasscode);
      await userRepository.updateSessionId(user.id, crypto.randomUUID());

      // 5. Message only — no user, hash, or token (CON-API-05)
      return 'Passcode changed successfully';
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Change passcode failed: ${error.message}`, error.statusCode || 500);
    }
  },

  deleteAccount: async (userId) => {
    try {
      // Deleting the user will trigger CASCADE delete for all related tables
      const success = await userRepository.deleteUser(userId);
      if (!success) {
        throw new AppError('User not found or already deleted', 404);
      }
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Account deletion failed: ${error.message}`, 500);
    }
  }
};

module.exports = authService;
