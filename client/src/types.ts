export interface User {
  id: number;
  phone: string;
  name: string;
  role: 'admin' | 'dispatcher' | 'master';
  companyId: string;
  // Поле password намеренно отсутствует! Бэкенд не должен его возвращать.
}

export interface Ticket {
  id: number;
  address: string;
  description: string;
  type: 'emergency' | 'regular';
  status: 'new' | 'in_work' | 'completed';
  createdAt: string; // Строгое поле, так как в БД есть @default(now())
  assignedAt: string | null;
  completedAt: string | null;
  companyId: string;
  masterId: number | null;
  managerRating: number | null;
  managerComment: string | null;
}

export interface MeterReading {
  id: number;
  companyId: string;
  address: string;
  type: string; // Желательно потом тоже свести к union типу, например: 'water' | 'electricity' | 'gas'
  value: number; // Float из базы
  createdAt: string;
}

// Тип для ответа при проверке токена-приглашения (если понадобится типизировать ответ /api/registration)
export interface InviteData {
  role: 'dispatcher' | 'master';
  companyId: string;
}