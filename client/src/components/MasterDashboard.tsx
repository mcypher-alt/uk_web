import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { User, Ticket } from '../types.js';

const MasterDashboard = ({ user }: { user: User }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'new' | 'in_work'>('new');

  useEffect(() => {
    // Автоматически берем masterId из сессии
    axios.get('/api/tickets/my', {
      params: { companyId: user.companyId, masterId: user.id, status: filter }
    })
    .then(res => setTickets(res.data.tickets))
    .catch(err => console.error(err));
  }, [user.companyId, user.id, filter]);

  return (
    <div className="p-4 w-full max-w-md mx-auto"> {/* Mobile First: узкий контейнер */}
      <h1 className="text-xl font-bold mb-4">Мои заявки</h1>
      
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('new')} 
          className={`flex-1 py-2 rounded text-center ${filter === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          Новые
        </button>
        <button onClick={() => setFilter('in_work')} 
          className={`flex-1 py-2 rounded text-center ${filter === 'in_work' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          В работе
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {tickets.length === 0 ? <p className="text-center text-gray-500 mt-10">Заявок нет</p> : null}
        {tickets.map(t => (
          <div key={t.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-sm">{t.address}</span>
              {t.type === 'emergency' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">Экстренная</span>}
            </div>
            <p className="text-gray-700 text-sm">{t.description}</p>
            {/* СПОРНЫЙ МОМЕНТ: Тут можно добавить кнопки "Взять в работу" / "Завершить" */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterDashboard;