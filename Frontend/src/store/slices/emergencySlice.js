import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/pimsApi';

export const checkInEmergency = createAsyncThunk(
  'emergency/checkIn',
  async (data, { rejectWithValue }) => {
    try {
      return await api.checkInEmergency(data);
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

export const assignTriage = createAsyncThunk(
  'emergency/assignTriage',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await api.assignTriage(id, data);
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

export const fetchEmergencyQueue = createAsyncThunk(
  'emergency/fetchQueue',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getEmergencyQueue();
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

export const dispenseOverride = createAsyncThunk(
  'emergency/dispenseOverride',
  async (data, { rejectWithValue }) => {
    try {
      return await api.dispenseOverride(data);
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

export const signOverride = createAsyncThunk(
  'emergency/signOverride',
  async ({ visitId, index }, { rejectWithValue }) => {
    try {
      return await api.signOverride(visitId, index);
    } catch (error) {
      return rejectWithValue(api.getApiMessage(error));
    }
  }
);

const emergencySlice = createSlice({
  name: 'emergency',
  initialState: {
    queue: [],
    checkInStatus: 'idle',
    status: 'idle',
    error: null
  },
  reducers: {
    setQueue: (state, action) => {
      state.queue = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmergencyQueue.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEmergencyQueue.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.queue = action.payload;
      })
      .addCase(fetchEmergencyQueue.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(checkInEmergency.pending, (state) => {
        state.checkInStatus = 'loading';
      })
      .addCase(checkInEmergency.fulfilled, (state) => {
        state.checkInStatus = 'succeeded';
      })
      .addCase(checkInEmergency.rejected, (state, action) => {
        state.checkInStatus = 'failed';
        state.error = action.payload;
      });
  }
});

export const { setQueue } = emergencySlice.actions;
export default emergencySlice.reducer;
