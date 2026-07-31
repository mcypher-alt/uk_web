import React, { useState, useEffect } from 'react';
import { toast } from 'sonner'; 
import { passwordApi, mobileApi } from '../api/index.js'; 

interface Props {
  onBackToLogin: () => void;
}

export default function ResetPasswordScreen({ onBackToLogin }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Состояние для работы с PUSH / поллингом
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'pending' | 'approved' | 'expired'>('pending');

  // Эффект для постоянного опроса сервера (Polling)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (step === 2 && sessionId && pushStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const res = await mobileApi.checkStatus(sessionId);
          
          if (res.status === 'approved') {
            setPushStatus('approved');
            toast.success('Подтверждено на телефоне!');
            clearInterval(interval);
          } else if (res.status === 'expired') {
            setPushStatus('expired');
            toast.error('Время ожидания истекло');
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Ошибка проверки статуса', error);
        }
      }, 3000); // Стучимся каждые 3 секунды
    }

    return () => clearInterval(interval); // Очищаем таймер при размонтировании
  }, [step, sessionId, pushStatus]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Введите номер телефона');
      return;
    }

    setIsLoading(true);
    setPushStatus('pending'); // Сбрасываем статус при новом запросе
    setCode('');
    setNewPassword('');

    try {
      const res = await passwordApi.forgotPassword(phone);
      toast.success(res.message || 'Запрос отправлен!');
      
      // Сохраняем ID сессии, который вернул бэкенд, чтобы начать поллинг
      if (res.sessionId) {
        setSessionId(res.sessionId);
      }
      setStep(2);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Ошибка при отправке запроса';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Если PUSH не подтвержден, требуем код. Если подтвержден — код не нужен.
    if (pushStatus !== 'approved' && !code) {
      toast.error('Введите код из СМС');
      return;
    }
    
    if (!newPassword) {
      toast.error('Введите новый пароль');
      return;
    }

    setIsLoading(true);
    try {
      await passwordApi.resetPassword({ phone, code, newPassword });
      toast.success('Пароль успешно изменен!');
      onBackToLogin();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Не удалось сбросить пароль';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-blue-600">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
          Восстановление пароля
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
          {step === 1 
            ? 'Введите номер, чтобы получить запрос на подтверждение' 
            : 'Подтвердите вход на телефоне и придумайте новый пароль'}
        </p>

        {step === 1 ? (
          <form onSubmit={handleSendCode} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Номер телефона
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+79XXXXXXXXX"
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-blue-400 flex justify-center items-center"
            >
              {isLoading ? 'Отправка...' : 'Отправить'}
            </button>
            
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Вспомнили пароль? Войти
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} noValidate className="space-y-5">
            
            {/* Скрываем поле кода, если PUSH прошел успешно */}
            {pushStatus !== 'approved' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Код из СМС
                  </label>
                  {pushStatus === 'pending' && (
                    <span className="text-xs text-blue-500 animate-pulse">Ожидаем PUSH...</span>
                  )}
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Или введите код, если PUSH не пришел"
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            )}

            {pushStatus === 'approved' && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm text-center font-medium">
                ✅ Номер успешно подтвержден!
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Новый пароль
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || pushStatus === 'expired'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-blue-400 flex justify-center items-center"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить новый пароль'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
            >
              Вернуться назад
            </button>
          </form>
        )}
      </div>
    </div>
  );
}