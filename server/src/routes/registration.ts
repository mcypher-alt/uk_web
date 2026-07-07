import { Router} from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js'; 
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<any> => {
    const token = req.query.token as string;
    if (!token) {
        return res.status(400).json({ error: 'Токен не передан' });
    }

    try {
        const invite = await prisma.validToken.findUnique({
        where: { token }
        });

        // Если токена нет, он уже использован или протух по времени
        if (!invite || invite.isUsed || new Date() > invite.expiresAt) {
        return res.status(400).json({ 
            error: 'Ссылка недействительна, уже была использована или её срок истек' 
        });
        }

        // Возвращаем фронту метаданные, чтобы он знал, под какую роль подстраивать интерфейс
        return res.json({
        role: invite.role,
        companyId: invite.companyId
        });
    } catch (error) {
        console.error('Ошибка при проверке инвайт-токена:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
    });

router.post('/generate', async (req: Request, res: Response): Promise<any> => {
    // Достаем phone из body, он может быть, а может и не быть (undefined)
    const { role, companyId, phone } = req.body;

    if (!role || !companyId) {
        return res.status(400).json({ error: 'Не указана роль сотрудника или ID компании' });
    }

    if (role !== 'dispatcher' && role !== 'master') {
        return res.status(400).json({
            error: 'Разрешено генерировать ссылки только для линейного персонала: dispatcher, master' 
        });
    }

    // === ПРОВЕРКА И ОЧИСТКА ТЕЛЕФОНА (ЕСЛИ ОН ПЕРЕДАН) ===
    let cleanPhone: string | null = null;
    
    if (phone) {
        let tempPhone = phone.replace(/\D/g, '');
        if (tempPhone.startsWith('8') && tempPhone.length === 11) {
            tempPhone = '7' + tempPhone.slice(1);
        }

        const phoneRegex = /^79\d{9}$/;
        if (!phoneRegex.test(tempPhone)) {
            return res.status(400).json({
                error: 'Некорректный формат номера телефона для сброса пароля.' 
            });
        }
        cleanPhone = tempPhone; // Если всё ок, сохраняем очищенный номер
    }
    // ====================================================

    try {
        const token = crypto.randomUUID(); 
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); 

        // Сохраняем токен в таблицу valid_tokens
        await prisma.validToken.create({
            data: {
                token,
                role,
                companyId,
                expiresAt,
                phone: cleanPhone // Сюда улетит либо '79991112233', либо null (если это новый юзер)
            }
        });

        const inviteUrl = `http://localhost:5173/?token=${token}`;

        return res.json({
            success: true,
            inviteUrl,
            expiresAt
        });
    } catch (error) {
        console.error('Ошибка при генерации инвайт-токена:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера при создании приглашения' });
    }
});

    /**
     * 2. POST /api/auth/registration
     * Финальный этап: создание сотрудника в БД и деактивация токена
     */
router.post('/', async (req: Request, res: Response): Promise<any> => {
    const { token, phone, password, name } = req.body;

    if (!token) {
    return res.status(400).json({ error: 'Отсутствует токен приглашения. Доступ запрещен.' });
    }

    if (!phone || !password || !name) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все поля формы: Имя, Логин и Пароль' });
    }

    let cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.startsWith('8') && cleanPhone.length === 11) {
        cleanPhone = '7' + cleanPhone.slice(1);
    }

    const phoneRegex = /^79\d{9}$/;

    if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
        error: 'Некорректный формат номера. Введите правильный мобильный телефон (например, +7 (999) 123-45-67)' 
        });
    }

    try {
        const invite = await prisma.validToken.findUnique({
        where: { token }
        });

        if (!invite || invite.isUsed || new Date() > invite.expiresAt) {
        return res.status(400).json({ error: 'Токен безопасности невалиден' });
        }
        if (invite.phone && invite.phone !== cleanPhone) {
            return res.status(403).json({ error: 'Этот инвайт-токен предназначен для другого номера телефона' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Запускаем транзакцию: если что-то упадет (например, логин уже занят), 
        // то ни юзер не создастся, ни токен не сгорит. Всё или ничего.
        await prisma.$transaction([
        // Создаем сотрудника
        prisma.user.upsert({
            where: { phone: cleanPhone }, // Ищем по телефону
            update: {
                password: hashedPassword,   // Если нашли — просто обновляем пароль на новый
                name,
                role: invite.role,
                companyId: invite.companyId
            },
            create: {
                phone: cleanPhone,          // Если не нашли — создаем нового сотрудника
                password: hashedPassword,
                name,
                role: invite.role,
                companyId: invite.companyId
            }
        }),
        // Помечаем инвайт-ссылку как отработанную
        prisma.validToken.update({
            where: { token },
            data: { isUsed: true }
        })
        ]);

        return res.json({ success: true, message: 'Сотрудник успешно добавлен в систему!' });
    } catch (error: any) {
        console.error('Ошибка при регистрации сотрудника:', error);
        
        // Перехватываем уникальный индекс Prisma (если логин уже существует в БД)
        if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Пользователь с таким логином уже зарегистрирован' });
        }
        
        return res.status(500).json({ error: 'Не удалось завершить регистрацию' });
    }
});

export default router;