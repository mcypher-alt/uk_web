import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api/index.js';
import type { User, Ticket } from '../types.js';

export default function MasterDashboard({ user }: { user: User }) {
  const [statusFilter, setStatusFilter] = useState<'new' | 'in_work'>('new');
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
  queryKey: ['myTickets', statusFilter],
  queryFn: () => {
    // ЖЕСТКАЯ ПРОВЕРКА: если прилетел массив, вытаскиваем строку ['crocus'] -> 'crocus'
    const cleanCompanyId = Array.isArray(user.companyId) 
      ? user.companyId[0] 
      : user.companyId;

    return ticketsApi.getMyTickets({ 
      companyId: cleanCompanyId, // Передаем строго СТРОКУ
      masterId: Number(user.id), 
      status: statusFilter 
    });
  },
});

  const acceptMutation = useMutation({
    mutationFn: ticketsApi.acceptByMaster,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myTickets'] }),
  });

  const completeMutation = useMutation({
    mutationFn: ticketsApi.completeByMaster,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myTickets'] }),
  });

  if (isLoading) return <div className="text-center p-4">Загрузка...</div>;

  return (
    <div className="max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-center mb-6">Мои заявки</h2>
      
      <div className="flex gap-2 mb-4 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
        <button 
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'new' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
          onClick={() => setStatusFilter('new')}
        >
          Новые
        </button>
        <button 
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'in_work' ? 'bg-gray-600 text-white' : 'text-gray-500'}`}
          onClick={() => setStatusFilter('in_work')}
        >
          В работе
        </button>
      </div>

      <div className="space-y-4">
        {tickets?.map((ticket: Ticket) => (
          <div key={ticket.id} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-cyan-400">
            <h3 className="font-bold text-lg mb-1">{ticket.address}</h3>
            <p className="text-sm text-gray-400 mb-4">{ticket.description}</p>
            
            {ticket.status === 'new' && (
              <button 
                onClick={() => acceptMutation.mutate({ ticketId: ticket.id, masterId: user.id })}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium"
              >
                Взять в работу
              </button>
            )}

            {ticket.status === 'in_work' && (
               /* Спорный момент: Нативный свайп лучше делать через react-use-gesture. 
                  Для надежности на 3g и старых устройствах часто используют input type="range" 
                  как хак для свайпа без тяжелых библиотек. */
              <div className="relative h-12 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                <span className="absolute text-sm text-gray-300 pointer-events-none">Свайпните вправо</span>
                <input 
                  type="range" 
                  min="0" max="100" defaultValue="0"
                  className="w-full h-full opacity-0 cursor-pointer absolute z-10"
                  onMouseUp={(e) => {
                    if (parseInt(e.currentTarget.value) > 80) {
                      completeMutation.mutate({ ticketId: ticket.id, masterId: user.id });
                    }
                    e.currentTarget.value = "0"; // Сброс, если не дотянул
                  }}
                  onTouchEnd={(e) => {
                    if (parseInt(e.currentTarget.value) > 80) {
                      completeMutation.mutate({ ticketId: ticket.id, masterId: user.id });
                    }
                    e.currentTarget.value = "0";
                  }}
                />
              </div>
            )}
          </div>
        ))}
        {tickets?.length === 0 && <p className="text-center text-gray-500">Заявок нет</p>}
      </div>
    </div>
  );
}