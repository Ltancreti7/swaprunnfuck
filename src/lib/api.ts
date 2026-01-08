const API_BASE = '/api';

export interface ApiError {
  error: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ user: { id: string; email: string; role: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, role: string) =>
      apiRequest<{ user: { id: string; email: string; role: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      }),
    logout: () =>
      apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    me: () =>
      apiRequest<{ user: { id: string; email: string; role: string } | null; profile: any }>('/auth/me'),
  },
  dealers: {
    list: () => apiRequest<any[]>('/dealers'),
    get: (id: string) => apiRequest<any>(`/dealers/${id}`),
    current: () => apiRequest<{ dealer: any; adminRole: string }>('/dealer/current'),
    create: (data: any) =>
      apiRequest<any>('/dealers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequest<any>(`/dealers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  sales: {
    list: () => apiRequest<any[]>('/sales'),
    current: () => apiRequest<any>('/sales/current'),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/sales/dealer/${dealerId}`),
    create: (data: any) =>
      apiRequest<any>('/sales', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequest<any>(`/sales/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/sales/${id}`, { method: 'DELETE' }),
    checkPreregistered: (email: string, dealerId: string) =>
      apiRequest<{ preRegistered: boolean; salesId?: string }>('/sales/check-preregistered', {
        method: 'POST',
        body: JSON.stringify({ email, dealerId }),
      }),
    activate: (salesId: string) =>
      apiRequest<any>('/sales/activate', { method: 'POST', body: JSON.stringify({ salesId }) }),
  },
  drivers: {
    list: () => apiRequest<any[]>('/drivers'),
    get: (id: string) => apiRequest<any>(`/drivers/${id}`),
    approvedByDealer: (dealerId: string) => apiRequest<any[]>(`/drivers/approved/${dealerId}`),
    create: (data: any) =>
      apiRequest<any>('/drivers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequest<any>(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/drivers/${id}`, { method: 'DELETE' }),
  },
  deliveries: {
    list: () => apiRequest<any[]>('/deliveries'),
    get: (id: string) => apiRequest<any>(`/deliveries/${id}`),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/deliveries/dealer/${dealerId}`),
    bySales: (salesId: string) => apiRequest<any[]>(`/deliveries/sales/${salesId}`),
    create: (data: any) =>
      apiRequest<any>('/deliveries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequest<any>(`/deliveries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  messages: {
    list: (deliveryId: string) => apiRequest<any[]>(`/messages/${deliveryId}`),
    create: (data: any) =>
      apiRequest<any>('/messages', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (deliveryId: string) =>
      apiRequest<{ success: boolean }>(`/messages/${deliveryId}/read`, { method: 'POST' }),
  },
  notifications: {
    list: () => apiRequest<any[]>('/notifications'),
    create: (data: any) =>
      apiRequest<any>('/notifications', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: string) =>
      apiRequest<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
  },
  driverApplications: {
    list: () => apiRequest<any[]>('/driver-applications'),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/driver-applications/dealer/${dealerId}`),
    create: (data: any) =>
      apiRequest<any>('/driver-applications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequest<any>(`/driver-applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  approvedDriverDealers: {
    list: () => apiRequest<any[]>('/approved-driver-dealers'),
    create: (data: any) =>
      apiRequest<any>('/approved-driver-dealers', { method: 'POST', body: JSON.stringify(data) }),
    delete: (driverId: string, dealerId: string) =>
      apiRequest<{ success: boolean }>(`/approved-driver-dealers/${driverId}/${dealerId}`, { method: 'DELETE' }),
  },
  dealerAdmins: {
    list: () => apiRequest<any[]>('/dealer-admins'),
    create: (data: any) =>
      apiRequest<any>('/dealer-admins', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/dealer-admins/${id}`, { method: 'DELETE' }),
  },
};

export default api;
