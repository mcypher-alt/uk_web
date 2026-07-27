import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import formatPhone from '../helper/formatPhone.js';
import prisma from '../lib/prisma.js'; 
import bcrypt from 'bcrypt';

const router = Router();

// Настройка лимитера для СМС
const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 3, // Максимум 3 запроса с одного IP за указанное окно (15 мин)
  message: { error: 'Слишком много попыток запроса кода. Пожалуйста, подождите 15 минут.' },
  standardHeaders: true, // Возвращает информацию о лимите в заголовках `RateLimit-*`
  legacyHeaders: false, // Отключает старые заголовки `X-RateLimit-*`
});

router.post('/forgot-password', smsLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone: rawPhone } = req.body;
    if (!rawPhone) return res.status(400).json({ error: 'Укажите номер телефона' });

    const phone = formatPhone(rawPhone);
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь с таким номером не найден' });
    }

    const mockCode = '1111';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // +5 минут

    // Сохраняем/обновляем код в SQLite
    await prisma.passwordReset.upsert({
      where: { phone },
      update: { code: mockCode, expiresAt },
      create: { phone, code: mockCode, expiresAt },
    });

    console.log(`\n[MOCK SMS] Phone: ${phone}, Code: ${mockCode}\n`);
    return res.json({ message: 'Код для восстановления пароля отправлен' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// 2. Подтверждение и сброс пароля (сюда жесткий лимит можно не ставить, либо сделать отдельный на 10-20 попыток ввода)
router.post('/reset-password', async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone: rawPhone, code, newPassword } = req.body;

    if (!rawPhone || !code || !newPassword) {
      return res.status(400).json({ error: 'Переданы не все данные' });
    }

    const phone = formatPhone(rawPhone);
    const resetRecord = await prisma.passwordReset.findUnique({ where: { phone } });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Код не запрашивался или уже был использован' });
    }

    if (new Date() > resetRecord.expiresAt) {
      await prisma.passwordReset.delete({ where: { phone } });
      return res.status(400).json({ error: 'Время действия кода истекло' });
    }

    if (resetRecord.code !== code) {
      return res.status(400).json({ error: 'Неверный код подтверждения' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { phone },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.delete({
        where: { phone },
      }),
    ]);

    return res.json({ message: 'Пароль успешно изменен' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Ошибка при обновлении пароля' });
  }
});

export default router;