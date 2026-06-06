import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getCurrentUser, getApiMessage } from '../../api/pimsApi';
import {
  clearSession,
  getStoredRole,
  getStoredUser,
  getStoredLoginTime,
  isValidRole,
  updateStoredUser
} from '../../utils/session';

function getInitialState() {
  const user = getStoredUser();
  const role = user?.role;

  return {
    status: 'idle',
    user: user || null,
    role: isValidRole(role) ? role : getStoredRole(),
    lastLoginAt: getStoredLoginTime() || '',
    errorMessage: '',
    hydrationRequestId: ''
  };
}

export const hydrateAuthSession = createAsyncThunk(
  'auth/hydrateAuthSession',
  async (_arg, thunkApi) => {
    try {
      const data = await getCurrentUser({ skipSessionExpiryBroadcast: true });
      const user = data?.user || null;

      if (!user || !isValidRole(user.role)) {
        clearSession();
        return { user: null, role: '' };
      }

      if (user) {
        updateStoredUser(user);
      }

      return {
        user,
        role: user?.role || getStoredRole(),
        lastLoginAt: getStoredLoginTime() || new Date().toISOString()
      };
    } catch (error) {
      clearSession();
      return thunkApi.rejectWithValue(getApiMessage(error, 'Session expired. Please log in again.'));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setAuthenticatedSession(state, action) {
      const user = action.payload?.user || null;
      const role = user?.role;

      if (user && !isValidRole(role)) {
        state.status = 'anonymous';
        state.user = null;
        state.role = '';
        state.errorMessage = 'Invalid session role';
        return;
      }

      state.status = user ? 'authenticated' : 'anonymous';
      state.user = user;
      state.role = isValidRole(role) ? role : getStoredRole();
      state.lastLoginAt = getStoredLoginTime() || new Date().toISOString();
      state.errorMessage = '';
      state.hydrationRequestId = '';
    },
    clearAuthState(state) {
      state.status = 'anonymous';
      state.user = null;
      state.role = '';
      state.errorMessage = '';
      state.hydrationRequestId = '';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuthSession.pending, (state, action) => {
        state.status = 'checking';
        state.errorMessage = '';
        state.hydrationRequestId = action.meta.requestId;
      })
      .addCase(hydrateAuthSession.fulfilled, (state, action) => {
        if (state.hydrationRequestId && state.hydrationRequestId !== action.meta.requestId) {
          return;
        }

        const user = action.payload?.user || null;
        const role = action.payload?.role || user?.role || '';

        if (user && !isValidRole(role)) {
          clearSession();
          state.status = 'anonymous';
          state.user = null;
          state.role = '';
          state.errorMessage = 'Invalid session role';
          state.hydrationRequestId = '';
          return;
        }

        state.status = user ? 'authenticated' : 'anonymous';
        state.user = user;
        state.role = role;
        state.lastLoginAt = action.payload?.lastLoginAt || getStoredLoginTime() || '';
        state.errorMessage = '';
        state.hydrationRequestId = '';
      })
      .addCase(hydrateAuthSession.rejected, (state, action) => {
        if (state.hydrationRequestId && state.hydrationRequestId !== action.meta.requestId) {
          return;
        }

        if (state.status === 'authenticated' && state.user) {
          state.hydrationRequestId = '';
          return;
        }

        state.status = 'anonymous';
        state.user = null;
        state.role = '';
        state.errorMessage = action.payload || 'Authentication check failed';
        state.hydrationRequestId = '';
      });
  }
});

export const { setAuthenticatedSession, clearAuthState } = authSlice.actions;
export default authSlice.reducer;
