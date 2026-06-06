import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/pimsApi';

export const recordVitals = createAsyncThunk('vitals/record', async (data, { rejectWithValue }) => {
  try {
    return await api.recordVitals(data);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchVitalsTimeline = createAsyncThunk('vitals/fetchTimeline', async ({ admissionId, limit, before }, { rejectWithValue }) => {
  try {
    const params = { limit, before };
    const response = await api.getVitalsTimeline(admissionId, params);
    return { admissionId, ...response };
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchLatestVitals = createAsyncThunk('vitals/fetchLatest', async (admissionId, { rejectWithValue }) => {
  try {
    const data = await api.getLatestVitals(admissionId);
    return { admissionId, data };
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchCriticalAdmissions = createAsyncThunk('vitals/fetchCritical', async (_, { rejectWithValue }) => {
  try {
    return await api.getCriticalAdmissions();
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const voidVitals = createAsyncThunk('vitals/void', async ({ vitalsId, voidReason }, { rejectWithValue }) => {
  try {
    return await api.voidVitals(vitalsId, { voidReason });
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

const vitalsSlice = createSlice({
  name: 'vitals',
  initialState: {
    timelines: {},      // { [admissionId]: VitalsDoc[] }
    latest: {},         // { [admissionId]: VitalsDoc | null }
    criticalAdmissions: [],
    pagination: {},     // { [admissionId]: { hasMore, nextCursor } }
    recordStatus: 'idle',
    status: 'idle',
    error: null
  },
  reducers: {
    clearVitalsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Record Vitals
      .addCase(recordVitals.pending, (state) => {
        state.recordStatus = 'loading';
      })
      .addCase(recordVitals.fulfilled, (state, action) => {
        state.recordStatus = 'succeeded';
        const record = action.payload;
        const admissionId = record.admissionRef;
        
        // Prepend to timeline
        if (!state.timelines[admissionId]) state.timelines[admissionId] = [];
        state.timelines[admissionId].unshift(record);
        
        // Update latest
        state.latest[admissionId] = record;
      })
      .addCase(recordVitals.rejected, (state, action) => {
        state.recordStatus = 'failed';
        state.error = action.payload;
      })

      // Fetch Timeline
      .addCase(fetchVitalsTimeline.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchVitalsTimeline.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { admissionId, data, hasMore, nextCursor } = action.payload;
        
        const existing = state.timelines[admissionId] || [];
        const incoming = data || [];
        
        // Dedup by _id on every fetch/append
        const merged = action.meta.arg.before ? [...existing, ...incoming] : incoming;
        state.timelines[admissionId] = [...new Map(merged.map(v => [v._id, v])).values()]
          .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

        state.pagination[admissionId] = { hasMore, nextCursor };
      })
      .addCase(fetchVitalsTimeline.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Latest
      .addCase(fetchLatestVitals.fulfilled, (state, action) => {
        state.latest[action.payload.admissionId] = action.payload.data;
      })

      // Fetch Critical
      .addCase(fetchCriticalAdmissions.fulfilled, (state, action) => {
        state.criticalAdmissions = action.payload;
      })

      // Void Vitals
      .addCase(voidVitals.fulfilled, (state, action) => {
        const record = action.payload;
        const admissionId = record.admissionRef;
        if (state.timelines[admissionId]) {
          state.timelines[admissionId] = state.timelines[admissionId].map(v => 
            v._id === record._id ? record : v
          );
        }
        if (state.latest[admissionId]?._id === record._id) {
          state.latest[admissionId] = record;
        }
      });
  }
});

export const { clearVitalsError } = vitalsSlice.actions;
export default vitalsSlice.reducer;
