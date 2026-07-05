import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { User, Ticket } from '../types.js';

const DispatcherDashboard = ({ user }: { user: User }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Стейты фильтров
  const [statusFilter, setStatusFilter] = useState<string>(''); // '', 'new', 'in_work', 'completed'
  const [isEmergency, setIsEmergency] = useState(false);
  const [isUnassigned, setIsUnassigned] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const params: any = { companyId: user.companyId };
        if (statusFilter) params.status = statusFilter;
        if (isEmergency) params.type = 'emergency';
        if (isUnassigned) params.masterId = null; // СПОРНЫЙ МОМЕНТ: Бэкенд должен корректно обрабатывать masterId=null в query строке

        const res = await axios.get('/api/tickets', { params });
        // Предполагаем, что бэкенд отдает массив заявок напрямую или оборачивает. 
        // СПОРНЫЙ МОМЕНТ: Проверь формат ответа твоего API
        setTickets(res.data.tickets || res.data); 
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchTickets();
  }, [user.companyId, statusFilter, isEmergency, isUnassigned]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Панель диспетчера</h1>
      
      {/* Фильтры */}
      <div className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-4 items-center">
        <select className="border p-2 rounded" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="new">Новые</option>
          <option value="in_work">В работе</option>
          <option value="completed">Завершенные</option>
        </select>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isUnassigned} onChange={e => setIsUnassigned(e.target.checked)} />
          Только неназначенные
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isEmergency} onChange={e => setIsEmergency(e.target.checked)} />
          <span className="text-red-600 font-semibold">Экстренные</span>
        </label>
      </div>

      {/* Таблица заявок (Десктопный вид для удобства диспетчера) */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">ID</th>
              <th className="p-3">Адрес</th>
              <th className="p-3">Проблема</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Мастер</th>
              <th className="p-3">Создана</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-3">#{t.id}</td>
                <td className="p-3 font-medium">
                  {t.address}
                  {t.type === 'emergency' && <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded">30 мин</span>}
                </td>
                <td className="p-3 text-sm text-gray-600">{t.description}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    t.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    t.status === 'in_work' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {t.masterId ? `Мастер #${t.masterId}` : <span className="text-red-500 font-semibold">Не назначен</span>}
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString('ru-RU') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DispatcherDashboard;