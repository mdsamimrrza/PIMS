import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/pimsApi';

export const createAdmission = createAsyncThunk('admissions/create', async (data, { rejectWithValue }) => {
  try {
    return await api.createAdmission(data);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchActiveAdmissions = createAsyncThunk('admissions/fetchActive', async (params, { rejectWithValue }) => {
  try {
    return await api.getActiveAdmissions(params);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchAdmission = createAsyncThunk('admissions/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await api.getAdmission(id);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const dischargePatient = createAsyncThunk('admissions/discharge', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await api.dischargePatient(id, data);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const fetchPatientAdmissions = createAsyncThunk('admissions/fetchByPatient', async (pid, { rejectWithValue }) => {
  try {
    return await api.getPatientAdmissions(pid);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

const admissionSlice = createSlice({
  name: 'admissions',
  initialState: {
    admissions: [],
    selected: null,
    pagination: { total: 0, page: 1, limit: 20 },
    status: 'idle',
    error: null,
  },
  reducers: {
    clearAdmissionError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Active
      .addCase(fetchActiveAdmissions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchActiveAdmissions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.admissions = action.payload.admissions;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit
        };
      })
      .addCase(fetchActiveAdmissions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch One
      .addCase(fetchAdmission.fulfilled, (state, action) => {
        state.selected = action.payload;
      })
      // Create
      .addCase(createAdmission.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createAdmission.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.admissions.unshift(action.payload);
      })
      .addCase(createAdmission.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Discharge
      .addCase(dischargePatient.fulfilled, (state, action) => {
        const discharged = action.payload;
        state.admissions = state.admissions.filter(a => a._id !== discharged._id);
        if (state.selected?._id === discharged._id) {
          state.selected = discharged;
        }
      });
  },
});

export const { clearAdmissionError } = admissionSlice.actions;
export default admissionSlice.reducer;
