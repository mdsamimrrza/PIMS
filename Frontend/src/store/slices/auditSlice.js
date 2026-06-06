import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/pimsApi';

export const fetchAuditLogs = createAsyncThunk(
  'audit/fetchLogs',
  async (params, { rejectWithValue }) => {
    try {
      return await api.listAuditLogs(params);
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

export const fetchAuditStats = createAsyncThunk(
  'audit/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getAuditStats();
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

export const fetchResourceHistory = createAsyncThunk(
  'audit/fetchHistory',
  async ({ collection, docId }, { rejectWithValue }) => {
    try {
      return await api.getResourceHistory(collection, docId);
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

const auditSlice = createSlice({
  name: 'audit',
  initialState: {
    logs: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    stats: null,
    history: [],
    loading: false,
    error: null
  },
  reducers: {
    clearAuditError: (state) => {
      state.error = null;
    },
    resetAuditHistory: (state) => {
      state.history = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Logs
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Stats
      .addCase(fetchAuditStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Fetch History
      .addCase(fetchResourceHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      });
  }
});

export const { clearAuditError, resetAuditHistory } = auditSlice.actions;
export default auditSlice.reducer;
