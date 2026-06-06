import axios from 'axios';
import { clearSession, getStoredRole } from '../utils/session';

export const SESSION_EXPIRED_EVENT = 'pims:session-expired';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
  withCredentials: true
});

// lightweight client used to fetch CSRF token to avoid interceptor recursion
const csrfClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || '');
    const isLogoutRequest = requestUrl.includes('/auth/logout');
    const skipSessionExpiryBroadcast = Boolean(error?.config?.skipSessionExpiryBroadcast);

    if (error.response?.status === 401 && !isLogoutRequest && !skipSessionExpiryBroadcast) {
      const previousRole = getStoredRole();
      if (previousRole) {
        clearSession();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
            detail: { role: previousRole }
          }));
        }
      }
    }

    return Promise.reject(error);
  }
);

// Attach CSRF token for mutating requests if missing
apiClient.interceptors.request.use(async (config) => {
  try {
    const method = String(config.method || 'get').toLowerCase();
    const isSafe = ['get', 'head', 'options'].includes(method);
    if (!isSafe && !(config.headers && (config.headers['x-csrf-token'] || config.headers['X-CSRF-Token']))) {
      const res = await csrfClient.get('/csrf-token');
      const token = res?.data?.data?.csrfToken;
      if (token) {
        config.headers = config.headers || {};
        config.headers['x-csrf-token'] = token;
      }
    }
  } catch (e) {
    // ignore token fetch errors — server will reject the request if CSRF is required
  }

  return config;
}, (err) => Promise.reject(err));

function unwrap(response) {
  return response?.data?.data;
}

export function getApiMessage(error, fallback = 'Something went wrong') {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return 'The request took too long to complete. This might be due to slow email delivery or server load. Please check if the data was submitted before retrying.';
  }
  const data = error?.response?.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const firstError = data.errors[0];
    return `${data.message}: ${firstError.field} ${firstError.message}`;
  }
  return data?.message || error?.message || fallback;
}

export async function login(payload) {
  return unwrap(await apiClient.post('/auth/login', payload));
}

export async function getCurrentUser(options = {}) {
  return unwrap(await apiClient.get('/auth/me', {
    skipSessionExpiryBroadcast: Boolean(options.skipSessionExpiryBroadcast)
  }));
}

export async function getMyPatientRecord() {
  return unwrap(await apiClient.get('/patients/me'));
}

export async function logout() {
  return unwrap(await apiClient.post('/auth/logout'));
}

export async function forgotPassword(payload) {
  return unwrap(await apiClient.post('/auth/forgot-password', payload));
}

export async function resetPassword(payload) {
  return unwrap(await apiClient.post('/auth/reset-password', payload));
}

export async function changePassword(payload) {
  return unwrap(await apiClient.put('/auth/change-password', payload));
}

export async function listPatients(params) {
  return unwrap(await apiClient.get('/patients', { params }));
}

export async function getPatientById(id) {
  return unwrap(await apiClient.get(`/patients/${id}`));
}

export async function createPatient(payload) {
  return unwrap(await apiClient.post('/patients', payload));
}

export async function createPatientPortalAccount(patientId, payload) {
  return unwrap(await apiClient.post(`/patients/${patientId}/portal-account`, payload));
}

export async function listMedicines(params) {
  return unwrap(await apiClient.get('/medicines', { params }));
}

export async function createMedicine(payload) {
  return unwrap(await apiClient.post('/medicines', payload));
}

export async function getAtcTree() {
  return unwrap(await apiClient.get('/atc/tree'));
}

export async function getAtcNode(code) {
  return unwrap(await apiClient.get(`/atc/${code}`));
}

export async function searchAtc(params) {
  return unwrap(await apiClient.get('/atc/search', { params }));
}

export async function listPrescriptions(params) {
  return unwrap(await apiClient.get('/prescriptions', { params }));
}

export async function getPrescription(id) {
  return unwrap(await apiClient.get(`/prescriptions/${id}`));
}

export async function createPrescription(payload) {
  return unwrap(await apiClient.post('/prescriptions', payload));
}

export async function updateDraftPrescription(id, payload) {
  return unwrap(await apiClient.patch(`/prescriptions/${id}`, payload));
}

export async function updatePrescriptionStatus(id, payload) {
  return unwrap(await apiClient.put(`/prescriptions/${id}/status`, payload));
}

export async function downloadPrescriptionPdf(id) {
  return apiClient.get(`/prescriptions/${id}/pdf`, {
    responseType: 'blob'
  });
}

export async function listInventory(params) {
  return unwrap(await apiClient.get('/inventory', { params }));
}

export async function createInventoryItem(payload) {
  return unwrap(await apiClient.post('/inventory', payload));
}

export async function updateInventoryItem(id, payload) {
  return unwrap(await apiClient.put(`/inventory/${id}`, payload));
}

export async function deleteInventoryItem(id) {
  return unwrap(await apiClient.delete(`/inventory/${id}`));
}

export async function getInventoryAudit(params) {
  return unwrap(await apiClient.get('/inventory/audit', { params }));
}

export async function listAlerts(params) {
  return unwrap(await apiClient.get('/alerts', { params }));
}

export async function acknowledgeAlert(id) {
  return unwrap(await apiClient.put(`/alerts/${id}/acknowledge`));
}

export async function dismissAlert(id) {
  return unwrap(await apiClient.put(`/alerts/${id}/dismiss`));
}

export async function getSummaryReport(params) {
  return unwrap(await apiClient.get('/reports/summary', { params }));
}

export async function getPatientSummaryReport(params) {
  return unwrap(await apiClient.get('/reports/patient-summary', { params }));
}

export async function getAtcUsageReport(params) {
  return unwrap(await apiClient.get('/reports/atcUsage', { params }));
}

export async function getFulfillmentReport(params) {
  return unwrap(await apiClient.get('/reports/fulfillment', { params }));
}

export async function listUsers(params) {
  return unwrap(await apiClient.get('/users', { params }));
}

export async function createUser(payload) {
  return unwrap(await apiClient.post('/users', payload));
}

export async function deactivateUser(id) {
  return unwrap(await apiClient.delete(`/users/${id}`));
}

export async function updateUser(id, payload) {
  return unwrap(await apiClient.put(`/users/${id}`, payload));
}

export async function permanentlyDeleteUser(id) {
  return unwrap(await apiClient.delete(`/users/${id}/permanent`));
}

// --- HOSPITAL MANAGEMENT APIs (Admissions & Beds) ---

export async function getBedLayout() {
  return unwrap(await apiClient.get('/beds/layout'));
}

export async function getAvailableBeds(ward) {
  return unwrap(await apiClient.get('/beds/available', { params: { ward } }));
}

export async function updateBedStatus(id, data) {
  return unwrap(await apiClient.patch(`/beds/${id}/status`, data));
}

export async function getSanitQueue() {
  return unwrap(await apiClient.get('/beds/sanitize'));
}

export async function createAdmission(data) {
  return unwrap(await apiClient.post('/admissions', data));
}

export async function getActiveAdmissions(params) {
  return unwrap(await apiClient.get('/admissions', { params }));
}

export async function getAdmission(id) {
  return unwrap(await apiClient.get(`/admissions/${id}`));
}

export async function dischargePatient(id, data) {
  return unwrap(await apiClient.patch(`/admissions/${id}/discharge`, data));
}

export async function getPatientAdmissions(pid) {
  return unwrap(await apiClient.get(`/admissions/patient/${pid}`));
}

// --- OTHER HOSPITAL APIs ---

export async function createPharmacyOrder(payload) {
  return unwrap(await apiClient.post('/pharmacy', payload));
}

export async function getPharmacyOrder(id) {
  return unwrap(await apiClient.get(`/pharmacy/${id}`));
}

export async function createInvoice(payload) {
  return unwrap(await apiClient.post('/billing', payload));
}

export async function payInvoice(id, payload) {
  return unwrap(await apiClient.post(`/billing/${id}/pay`, payload));
}

export async function listInvoices(params) {
  return unwrap(await apiClient.get('/billing', { params }));
}

export async function processPayment(id, data) {
  return unwrap(await apiClient.post(`/billing/${id}/pay`, data));
}

export async function getPayments(id) {
  return unwrap(await apiClient.get(`/billing/${id}/payments`));
}

export async function applyInsurance(id, data) {
  return unwrap(await apiClient.post(`/billing/${id}/insurance`, data));
}

export async function downloadReceipt(id) {
  return await apiClient.get(`/billing/${id}/receipt`, { responseType: 'blob' });
}

// Emergency A&E
export async function checkInEmergency(data) {
  return unwrap(await apiClient.post('/emergency/visit', data));
}

export async function assignTriage(id, data) {
  return unwrap(await apiClient.patch(`/emergency/visit/${id}/triage`, data));
}

export async function getEmergencyQueue() {
  return unwrap(await apiClient.get('/emergency/queue'));
}

export async function dispenseOverride(data) {
  return unwrap(await apiClient.post('/emergency/dispense-override', data));
}

export async function signOverride(visitId, index) {
  return unwrap(await apiClient.patch(`/emergency/override/${visitId}/${index}/sign`, {}));
}

export async function createAppointment(payload) {
  return unwrap(await apiClient.post('/appointments', payload));
}

export async function listAppointments(params) {
  return unwrap(await apiClient.get('/appointments', { params }));
}

// --- VITALS MODULE APIs ---

export async function recordVitals(data) {
  return unwrap(await apiClient.post('/vitals', data));
}

export async function getVitalsTimeline(admissionId, params) {
  const res = await apiClient.get(`/vitals/admissions/${admissionId}/timeline`, { params });
  return res.data;
}

export async function getLatestVitals(admissionId) {
  return unwrap(await apiClient.get(`/vitals/admissions/${admissionId}/latest`));
}

export async function getCriticalAdmissions() {
  return unwrap(await apiClient.get('/vitals/critical'));
}

export async function voidVitals(vitalsId, data) {
  return unwrap(await apiClient.patch(`/vitals/${vitalsId}/void`, data));
}

// --- AUDIT LOG APIs ---

export async function listAuditLogs(params) {
  return unwrap(await apiClient.get('/audit', { params }));
}

export async function getAuditStats() {
  return unwrap(await apiClient.get('/audit/stats'));
}

export async function getResourceHistory(collection, docId) {
  return unwrap(await apiClient.get(`/audit/resource/${collection}/${docId}`));
}

export { apiClient };
