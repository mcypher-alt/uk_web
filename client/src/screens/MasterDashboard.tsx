import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api/index.js';
import type { User, Ticket } from '../types.js';

// --- КОМПОНЕНТ ТАЙМЕРА ---
export function EmergencyTimer({ createdAt }: { createdAt: string | Date }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const deadlineTime = createdTime + 30 * 60 * 1000; // +30 минут
      const now = Date.now();
      const difference = deadlineTime - now;

      return difference > 0 ? Math.floor(difference / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (timeLeft <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-red-600 text-white animate-pulse uppercase tracking-wider">
        Просрочено
      </span>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const textColor = minutes < 5 
    ? 'text-red-600 dark:text-red-400 font-black animate-pulse' 
    : 'text-amber-600 dark:text-amber-400 font-bold';

  return (
    <span className={`font-mono text-sm ${textColor} bg-white dark:bg-gray-900 px-2 py-0.5 rounded-md shadow-sm border border-gray-200 dark:border-gray-700`}>
      ⏱️ {formattedTime}
    </span>
  );
}

// --- ОСНОВНОЙ КОМПОНЕНТ ПАНЕЛИ МАСТЕРА ---
export default function MasterDashboard({ user }: { user: User }) {
  const [statusFilter, setStatusFilter] = useState<'new' | 'in_work'>('new');
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['myTickets', statusFilter],
    queryFn: () => {
      const cleanCompanyId = Array.isArray(user.companyId) 
        ? user.companyId[0] 
        : user.companyId;

      return ticketsApi.getMyTickets({ 
        companyId: cleanCompanyId, 
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

  if (isLoading) return <div className="text-center p-4 text-gray-500 font-medium">Загрузка заявок...</div>;

  return (
    <div className="max-w-md mx-auto w-full pb-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">Мои заявки</h2>
      
      {/* ПЕРЕКЛЮЧАТЕЛЬ СТАТУСОВ */}
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <button 
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            statusFilter === 'new' 
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          onClick={() => setStatusFilter('new')}
        >
          Новые
        </button>
        <button 
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            statusFilter === 'in_work' 
              ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-500 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          onClick={() => setStatusFilter('in_work')}
        >
          В работе
        </button>
      </div>

      {/* СПИСОК ЗАЯВОК */}
      <div className="space-y-4">
        {tickets?.map((ticket: Ticket) => (
          <div 
            key={ticket.id} 
            className={`bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border-l-4 transition-colors relative overflow-hidden ${
              ticket.type === 'emergency' 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-cyan-400 dark:border-cyan-500'
            }`}
          >
            {/* ШАПКА КАРТОЧКИ: Беджики и Таймер */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  #{ticket.id}
                </span>
                {ticket.type === 'emergency' && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Экстренно
                  </span>
                )}
              </div>
              
              {/* Выводим таймер, если заявка экстренная */}
              {ticket.type === 'emergency' && (
                <EmergencyTimer createdAt={ticket.createdAt} />
              )}
            </div>

            {/* ИНФОРМАЦИЯ О ЗАЯВКЕ */}
            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-2">
              {ticket.address}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
              {ticket.description}
            </p>
            
            {/* КНОПКА: ВЗЯТЬ В РАБОТУ */}
            {ticket.status === 'new' && (
              <button 
                onClick={() => acceptMutation.mutate({ ticketId: ticket.id, masterId: Number(user.id) })}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                Взять в работу
              </button>
            )}

            {/* СВАЙП: ЗАВЕРШИТЬ */}
            {ticket.status === 'in_work' && (
              <div className="relative h-14 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex items-center justify-center shadow-inner group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute text-sm font-bold text-gray-500 dark:text-gray-400 pointer-events-none tracking-wide">
                  Свайпните вправо для завершения ➔
                </span>
                <input 
                  type="range" 
                  min="0" max="100" defaultValue="0"
                  className="w-full h-full opacity-0 cursor-grab active:cursor-grabbing absolute z-10"
                  onMouseUp={(e) => {
                    if (parseInt(e.currentTarget.value) > 80) {
                      completeMutation.mutate({ ticketId: ticket.id, masterId: Number(user.id) });
                    }
                    e.currentTarget.value = "0";
                  }}
                  onTouchEnd={(e) => {
                    if (parseInt(e.currentTarget.value) > 80) {
                      completeMutation.mutate({ ticketId: ticket.id, masterId: Number(user.id) });
                    }
                    e.currentTarget.value = "0";
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {/* ПУСТОЕ СОСТОЯНИЕ */}
        {tickets?.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 border-dashed">
            <span className="text-4xl block mb-3">☕</span>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {statusFilter === 'new' ? 'Новых заявок пока нет' : 'Нет заявок в работе'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}