import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { ticketsApi, dictApi, authApi } from '../api/index.js';
import type { User, Ticket } from '../types.js';

interface EmergencyTimerProps {
  createdAt: string | Date; // Время создания заявки с бэкенда
}

export function EmergencyTimer({ createdAt }: EmergencyTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const deadlineTime = createdTime + 30 * 60 * 1000; // +30 минут в миллисекундах
      const now = Date.now();
      const difference = deadlineTime - now;

      return difference > 0 ? Math.floor(difference / 1000) : 0;
    };

    // Первичный расчет
    setTimeLeft(calculateTimeLeft());

    // Обновляем каждую секунду
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (timeLeft <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-600 text-white animate-pulse">
        ПРОСРОЧЕНО
      </span>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Форматируем в вид 05:09 вместо 5:9
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Меняем цвет в зависимости от того, сколько времени осталось (меньше 5 минут — красный)
  const textColor = minutes < 5 
    ? 'text-red-600 dark:text-red-400 font-black animate-pulse' 
    : 'text-amber-600 dark:text-amber-400 font-bold';

  return (
    <span className={`font-mono text-sm ${textColor}`}>
      ⏱️ {formattedTime}
    </span>
  );
}

export function MasterCell({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  // 2. Стейт для хранения точных координат окна
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, width: 0, isDropUp: false });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Умный обработчик кликов и скролла
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Закрываем, только если клик был НЕ по кнопке и НЕ внутри самого портала
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        portalRef.current && !portalRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Игнорируем скролл внутри самого списка мастеров, но закрываем меню при скролле таблицы
      if (portalRef.current && portalRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    // capture: true обязательно, чтобы перехватить скролл внутреннего div-а таблицы
    window.addEventListener('scroll', handleScroll, true); 

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const { data: masters = [], isLoading } = useQuery({
    queryKey: ['masters', ticket.companyId],
    queryFn: async () => {
      const res = await dictApi.getMasters(ticket.companyId);
      return Array.isArray(res) ? res : ((res as any)?.users || (res as any)?.data || []);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (masterId: number) => ticketsApi.assignMaster({ ticketId: ticket.id, masterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setIsOpen(false);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Не удалось назначить мастера')
  });

  // Расчет координат для портала
  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Если снизу меньше 260px, а сверху достаточно места — открываем вверх
      const isDropUp = spaceBelow < 260 && rect.top > 260;

      setCoords({
        left: rect.left,
        width: rect.width,
        top: rect.top,
        bottom: rect.bottom,
        isDropUp
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  if (ticket.status === 'completed') {
    if (ticket.masterId) {
      const assignedMaster = masters.find((m: User) => m.id === ticket.masterId);
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {assignedMaster ? assignedMaster.name : `Мастер #${ticket.masterId}`}
        </span>
      );
    }
    return <span className="text-gray-400 italic text-xs">Закрыта (без мастера)</span>;
  }

  const currentMaster = masters.find((m: User) => m.id === ticket.masterId);

  return (
    <div className="relative w-full max-w-55">
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        disabled={assignMutation.isPending || isLoading}
        className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-all duration-200 border rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 ${
          ticket.masterId
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
            : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 animate-pulse hover:bg-red-100 dark:hover:bg-red-900/20'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-400 dark:border-blue-500' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          <svg className={`w-4 h-4 shrink-0 ${ticket.masterId ? 'text-gray-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium truncate">
            {isLoading ? 'Загрузка...' : (currentMaster ? currentMaster.name : 'Назначить...')}
          </span>
        </div>

        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? (coords.isDropUp ? 'rotate-0' : 'rotate-180') : (coords.isDropUp ? 'rotate-180' : '')}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* МАГИЯ ПОРТАЛА: рендерится поверх всего сайта */}
      {isOpen && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            // Математика позиции от окна браузера
            ...(coords.isDropUp
              ? { bottom: `${window.innerHeight - coords.top + 8}px` }
              : { top: `${coords.bottom + 8}px` })
          }}
          className={`z-9999 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden ${
            coords.isDropUp ? 'origin-bottom' : 'origin-top'
          }`}
        >
          <div className="p-1.5 max-h-60 overflow-y-auto">
            {masters.length === 0 && (
              <div className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                Мастера не найдены
              </div>
            )}
            
            {masters.map((m: User) => {
              const isSelected = ticket.masterId === m.id;
              
              return (
                <button
                  key={m.id}
                  onClick={() => assignMutation.mutate(m.id)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 text-sm transition-all rounded-lg group ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex flex-col items-start truncate">
                    <span className="truncate">{m.name}</span>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-500/70 dark:text-blue-400/70' : 'text-gray-400 dark:text-gray-500'}`}>
                      ID: {m.id}
                    </span>
                  </div>

                  {isSelected && (
                    <svg className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body // Целевой узел портала
      )}
    </div>
  );
}

// ОСНОВНОЙ КОМПОНЕНТ ДИСПЕТЧЕРСКОЙ
export default function DispatcherDashboard({ user }: { user: User }) {
  const [filters, setFilters] = useState({
    companyId: 'all', 
    masterId: '',
    status: '',
    type: ''
  });

  // ПАГИНАЦИЯ
  const [currentPage, setCurrentPage] = useState(1);
  const TICKETS_PER_PAGE = 10;

  // Сброс страницы при смене фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const queryClient = useQueryClient();
  const userCompanies = Array.isArray(user.companyId) ? user.companyId : [user.companyId];

  // Грузим заявки
  const { data: rawTicketsData, isLoading: isTicketsLoading } = useQuery({
    queryKey: ['tickets', filters, user.companyId],
    queryFn: async () => {
      if (filters.companyId === 'all') {
        const requests = userCompanies.map(id => ticketsApi.getTickets({ ...filters, companyId: id, masterId: undefined }));
        const responses = await Promise.all(requests);
        return responses.flatMap(res => Array.isArray(res) ? res : ((res as any)?.tickets || (res as any)?.data || []));
      } else {
        const res = await ticketsApi.getTickets(filters);
        return Array.isArray(res) ? res : ((res as any)?.tickets || (res as any)?.data || []);
      }
    },
    enabled: userCompanies.length > 0, 
  });

  // Грузим мастеров ТОЛЬКО для фильтра в шапке (если выбрана конкретная УК)
  const { data: headerMasters = [] } = useQuery({
    queryKey: ['header_masters', filters.companyId],
    queryFn: async () => {
      if (filters.companyId === 'all') return [];
      const res = await dictApi.getMasters(filters.companyId);
      return Array.isArray(res) ? res : ((res as any)?.users || (res as any)?.data || []);
    },
    enabled: filters.companyId !== 'all',
  });

  const closeMutation = useMutation({
    mutationFn: (ticketId: number) => ticketsApi.closeByDispatcher({ ticketId, userId: Number(user.id) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Ошибка при закрытии заявки')
  });

  // Подготовка данных для пагинации
  const tickets: Ticket[] = rawTicketsData || [];
  const totalPages = Math.ceil(tickets.length / TICKETS_PER_PAGE);
  const paginatedTickets = tickets.slice(
    (currentPage - 1) * TICKETS_PER_PAGE,
    currentPage * TICKETS_PER_PAGE
  );

  // Состояние открытия модалки
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Поля формы создания сотрудника
  const [inviteForm, setInviteForm] = useState({
    companyId: userCompanies[0] || '',
    role: user.role === 'admin' ? 'dispatcher' : 'master',
    phone: ''
  });

  // Стейт для хранения сгенерированной ссылки
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const generateInviteMutation = useMutation({
    mutationFn: (data: typeof inviteForm) => authApi.generateInvite({
      role: data.role,
      companyId: data.companyId,
      phone: data.phone.trim() ? data.phone.trim() : undefined // Если пусто — шлем undefined
    }),
    onSuccess: (res: any) => {
      setGeneratedLink(res.inviteUrl);
      setInviteError(null);
    },
    onError: (err: any) => {
      setInviteError(err.response?.data?.error || err.response?.data?.message || 'Не удалось сгенерировать инвайт');
      setGeneratedLink(null);
    }
  });

  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);

  // Дефолтные поля формы заявки
  const [ticketForm, setTicketForm] = useState({
    companyId: userCompanies[0] || 'crocus', // Берём первую компанию из массива юзера (например, 'crocus')
    address: '',
    description: '',
    isEmergency: false
  });

  const { data: houses = [], isLoading: isHousesLoading } = useQuery({
    // queryKey теперь зависит от ticketForm.companyId. 
    // При смене компании React Query сам перезапустит запрос!
    queryKey: ['houses', ticketForm.companyId],
    queryFn: () => dictApi.getHouses(ticketForm.companyId),
    // Оптимизация: делаем запрос только если модалка открыта и компания выбрана
    enabled: isCreateTicketOpen && !!ticketForm.companyId, 
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: typeof ticketForm) => ticketsApi.create({
      companyId: data.companyId,
      address: data.address.trim(),
      description: data.description.trim(),
      type: data.isEmergency ? 'emergency' : 'regular' // Конвертируем булево значение в строку для бэка
    }),
    onSuccess: () => {
      // Сбрасываем кэш заявок, чтобы новая сразу появилась в таблице
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setIsCreateTicketOpen(false); // Закрываем окно
      setTicketForm({ companyId: userCompanies[0] || '', address: '', description: '', isEmergency: false }); // Чистим форму
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.response?.data?.message || 'Не удалось создать заявку');
    }
  });

  const [ticketIdToConfirm, setTicketIdToConfirm] = useState<number | null>(null);

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'completed') return <span className="text-green-600 dark:text-green-400 font-bold">Завершен</span>;
    if (status === 'in_work') return <span className="text-yellow-600 dark:text-yellow-500 font-bold">В процессе</span>;
    return <span className="text-cyan-600 dark:text-cyan-400 font-bold">Новое</span>;
  };

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-[1600px] mx-auto text-gray-900 dark:text-white transition-colors">
      <div className="flex justify-between items-end mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-750">
        <div>
          <h2 className="text-2xl font-bold">Панель диспетчера</h2>
        </div>
        
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm text-red-600 dark:text-red-500 font-bold cursor-pointer select-none px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <input 
              type="checkbox" 
              checked={filters.type === 'emergency'}
              onChange={(e) => setFilters(p => ({ ...p, type: e.target.checked ? 'emergency' : '' }))}
              className="w-4 h-4 accent-red-600 dark:accent-red-500 cursor-pointer"
            />
            Экстренные
          </label>

          <select 
            className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none transition-colors"
            value={filters.companyId}
            onChange={(e) => setFilters(p => ({ ...p, companyId: e.target.value, masterId: '' }))}
          >
            <option value="all">Все компании</option>
            {userCompanies.map(id => (
              <option key={id} value={id}>{id === 'crocus' ? 'АО Крокус' : id === 'meridian' ? 'Меридиан' : id}</option>
            ))}
          </select>
          
          <select 
            className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none transition-colors disabled:opacity-50"
            disabled={filters.companyId === 'all'}
            value={filters.masterId}
            onChange={(e) => setFilters(p => ({ ...p, masterId: e.target.value }))}
          >
            <option value="">Все мастера</option>
            {headerMasters.map((m: User) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select 
            className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none transition-colors"
            value={filters.status}
            onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
          >
            <option value="">Все статусы</option>
            <option value="new">Новое</option>
            <option value="in_work">В процессе</option>
            <option value="completed">Завершен</option>
          </select>
          <button
            onClick={() => {
              // Принудительно выставляем рабочую компанию перед открытием модалки
              setTicketForm(p => ({ ...p, companyId: userCompanies[0] || 'crocus', address: '' }));
              setIsCreateTicketOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            + Новая заявка
          </button>
          <button
            onClick={() => {
              setGeneratedLink(null);
              setInviteError(null);
              setIsInviteModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Создать сотрудника
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-750 overflow-hidden flex flex-col transition-colors">
        {isTicketsLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Загрузка...</div>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Заявок не найдено</div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold sticky top-0 z-10 transition-colors">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Адрес</th>
                    <th className="px-6 py-4">Проблема</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4">Мастер</th>
                    <th className="px-6 py-4">Создана</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  {/* ИСПОЛЬЗУЕМ paginatedTickets ВМЕСТО tickets */}
                  {paginatedTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {ticket.id}
                        <div className="text-xs text-gray-400 font-normal mt-0.5">{ticket.companyId}</div>
                      </td>
                      <td className="px-6 py-4 font-medium">{ticket.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {ticket.type === 'emergency' ? (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 w-max">
                              Экстренная
                            </span>
                            {/* Если заявка еще активна — крутим таймер в реальном времени */}
                            {ticket.status !== 'completed' && (
                              <EmergencyTimer createdAt={ticket.createdAt} />
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Обычная
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-6 py-4">
                        {/* Вызываем наш обновленный микро-компонент */}
                        <MasterCell ticket={ticket} />
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 text-right">
                      {ticket.status !== 'completed' && (
                        ticketIdToConfirm === ticket.id ? (
                          // СОСТОЯНИЕ ПОДТВЕРЖДЕНИЯ
                          <div 
                            className="flex flex-col items-end gap-2 opacity-100 transition-all w-32 ml-auto"
                            onMouseLeave={() => setTicketIdToConfirm(null)} // Сбрасываем, если убрали мышку
                            >
                            <button
                              onClick={() => {
                                closeMutation.mutate(ticket.id);
                                setTicketIdToConfirm(null); // Закрываем стейт после клика
                              }}
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm text-center"
                            >
                              Да, закрыть
                            </button>
                            <button
                              onClick={() => setTicketIdToConfirm(null)}
                              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm px-4 py-2 rounded-lg transition-colors text-center"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          // ОБЫЧНОЕ СОСТОЯНИЕ (появляется при наведении)
                          <button 
                            onClick={() => setTicketIdToConfirm(ticket.id)}
                            className="text-gray-400 hover:text-red-600 font-medium text-base transition-colors px-6 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100"
                          >
                            Закрыть
                          </button>
                        )
                      )}
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* БЛОК ПАГИНАЦИИ */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 mt-auto">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Страница <span className="font-bold text-gray-900 dark:text-white">{currentPage}</span> из {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ СОТРУДНИКА */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-md w-full p-6 text-gray-900 dark:text-white relative">
            
            <button 
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold mb-1">Регистрация сотрудника</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Генерация инвайт-ссылки для мастера или диспетчера</p>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-lg font-medium">
                {inviteError}
              </div>
            )}

            {generatedLink ? (
              // ЕСЛИ ССЫЛКА СГЕНЕРИРОВАНА УСПЕШНО
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs rounded-lg font-medium">
                  Ссылка успешно создана! Скопируйте её и передайте сотруднику:
                </div>
                <textarea
                  readOnly
                  value={generatedLink}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none select-all font-mono resize-none h-20"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    alert('Ссылка скопирована в буфер обмена!');
                  }}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-xl transition-colors"
                >
                  Скопировать ссылку
                </button>
              </div>
            ) : (
              // ФОРМА ВВОДА ДАННЫХ
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  generateInviteMutation.mutate(inviteForm);
                }}
                className="space-y-4"
              >
                {/* Поле 1: Выбор компании */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Компания</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none"
                    value={inviteForm.companyId}
                    onChange={(e) => setInviteForm(p => ({ ...p, companyId: e.target.value }))}
                  >
                    {userCompanies.map(id => (
                      <option key={id} value={id}>{id === 'crocus' ? 'АО Крокус' : id === 'meridian' ? 'Меридиан' : id}</option>
                    ))}
                  </select>
                </div>

                {/* Поле 2: Выбор Роли */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Роль сотрудника</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  >
                    {user.role === 'admin' ? (
                      <>
                        <option value="dispatcher">Диспетчер</option>
                        <option value="master">Мастер</option>
                      </>
                    ) : (
                      <option value="master">Мастер</option>
                    )}
                  </select>
                </div>

                {/* Поле 3: Необязательный телефон */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Номер телефона (необязательно)</label>
                  <input
                    type="tel"
                    placeholder="79991234567"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={generateInviteMutation.isPending}
                  className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  {generateInviteMutation.isPending ? 'Генерация...' : 'Создать инвайт'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЗАЯВКИ */}
      {isCreateTicketOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-md w-full p-6 text-gray-900 dark:text-white relative">
            
            <button 
              onClick={() => setIsCreateTicketOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold mb-1">Создание новой заявки</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Зарегистрировать новую проблему жильца в системе</p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!ticketForm.address || !ticketForm.description.trim()) {
                  alert('Выберите адрес и заполните описание проблемы!');
                  return;
                }
                createTicketMutation.mutate(ticketForm);
              }}
              className="space-y-4"
            >
              {/* Выбор УК */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Управляющая компания</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none"
                  value={ticketForm.companyId}
                  onChange={(e) => setTicketForm(p => ({ ...p, companyId: e.target.value, address: '' }))}
                >
                  {userCompanies.map(id => (
                    <option key={id} value={id}>{id === 'crocus' ? 'АО Крокус' : id === 'meridian' ? 'Меридиан' : id}</option>
                  ))}
                </select>
              </div>

              {/* Ввод адреса */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Адрес дома</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none disabled:opacity-50"
                  value={ticketForm.address}
                  onChange={(e) => setTicketForm(p => ({ ...p, address: e.target.value }))}
                  disabled={isHousesLoading}
                  required
                >
                  <option value="" disabled>
                    {isHousesLoading ? 'Загрузка списка домов...' : 'Выберите адрес из списка...'}
                  </option>
                  {houses.map((address: string, index: number) => (
                    <option key={index} value={address}>
                      {address}
                    </option>
                  ))}
                </select>
                
                {!isHousesLoading && houses.length === 0 && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">У этой УК пока нет зарегистрированных домов в базе данных</p>
                )}
              </div>

              {/* Текст проблемы */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Описание проблемы</label>
                <textarea
                  placeholder="Прорвало трубу в ванной, топит соседей..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 focus:outline-none resize-none h-24"
                  required
                />
              </div>

              {/* Чекбокс Экстренно */}
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none text-red-600 dark:text-red-400 font-bold text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={ticketForm.isEmergency}
                    onChange={(e) => setTicketForm(p => ({ ...p, isEmergency: e.target.checked }))}
                    className="w-5 h-5 accent-red-600 cursor-pointer"
                  />
                  Выставить статус: ЭКСТРЕННО (30 минут)
                </label>
              </div>

              <button
                type="submit"
                disabled={createTicketMutation.isPending || isHousesLoading}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 shadow-md"
              >
                {createTicketMutation.isPending ? 'Создание заявки...' : 'Зарегистрировать заявку'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}