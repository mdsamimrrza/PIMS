import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/pimsApi';

export const fetchBedLayout = createAsyncThunk('beds/fetchLayout', async (_, { rejectWithValue }) => {
  try {
    return await api.getBedLayout();
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchAvailableBeds = createAsyncThunk('beds/fetchAvailable', async (ward, { rejectWithValue }) => {
  try {
    return await api.getAvailableBeds(ward);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const updateBedStatus = createAsyncThunk('beds/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await api.updateBedStatus(id, { status });
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchSanitQueue = createAsyncThunk('beds/fetchSanitQueue', async (_, { rejectWithValue }) => {
  try {
    return await api.getSanitQueue();
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

const bedSlice = createSlice({
  name: 'beds',
  initialState: {
    layout: {},
    available: [],
    sanitQueue: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Layout
      .addCase(fetchBedLayout.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBedLayout.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.layout = action.payload;
      })
      .addCase(fetchBedLayout.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch Available
      .addCase(fetchAvailableBeds.fulfilled, (state, action) => {
        state.available = action.payload;
      })
      // Fetch Sanitization Queue
      .addCase(fetchSanitQueue.fulfilled, (state, action) => {
        state.sanitQueue = action.payload;
      })
      // Update Status (optimistic or refresh layout after)
      .addCase(updateBedStatus.fulfilled, (state, action) => {
        const updatedBed = action.payload;
        // Update in sanitQueue if present
        state.sanitQueue = state.sanitQueue.filter(b => b._id !== updatedBed._id);
        if (updatedBed.status === 'cleaning') {
          state.sanitQueue.push(updatedBed);
        }
      });
  },
});

export default bedSlice.reducer;
