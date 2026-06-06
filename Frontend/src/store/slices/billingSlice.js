import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/pimsApi';

export const fetchInvoices = createAsyncThunk('billing/fetchInvoices', async (params, { rejectWithValue }) => {
  try {
    return await api.listInvoices(params);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const processPartialPayment = createAsyncThunk('billing/processPayment', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await api.processPayment(id, data);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const applyInsurance = createAsyncThunk('billing/applyInsurance', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await api.applyInsurance(id, data);
  } catch (error) {
    return rejectWithValue(api.getApiMessage(error));
  }
});

export const downloadReceipt = createAsyncThunk('billing/downloadReceipt', async (id, { rejectWithValue }) => {
  try {
    const response = await api.downloadReceipt(id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipt-${id.slice(-8)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return id;
  } catch (error) {
    return rejectWithValue('Failed to download receipt');
  }
});

const billingSlice = createSlice({
  name: 'billing',
  initialState: {
    invoices: [],
    loading: false,
    downloadStatus: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => { state.loading = true; })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(processPartialPayment.fulfilled, (state, action) => {
        const index = state.invoices.findIndex(inv => inv._id === action.payload._id);
        if (index !== -1) state.invoices[index] = action.payload;
      })
      .addCase(applyInsurance.fulfilled, (state, action) => {
        const index = state.invoices.findIndex(inv => inv._id === action.payload._id);
        if (index !== -1) state.invoices[index] = action.payload;
      })
      .addCase(downloadReceipt.pending, (state) => { state.downloadStatus = 'loading'; })
      .addCase(downloadReceipt.fulfilled, (state) => { state.downloadStatus = 'succeeded'; })
      .addCase(downloadReceipt.rejected, (state) => { state.downloadStatus = 'failed'; });
  }
});

export default billingSlice.reducer;
