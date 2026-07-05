import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<any> => {
    const { companyId, address, description, type } = req.body;

    if (!companyId || !address || !description || !type) {
        return res.status(400).json({ error: 'Все поля (companyId, address, description, type) обязательны' });
    }

    if (type !== 'emergency' && type !== 'regular') {
        return res.status(400).json({ error: "Тип заявки должен быть либо 'emergency', либо 'regular'" });
    }

    try {
        const houseExists = await prisma.house.findUnique({
            where: {
                address_companyId: {
                    address: String(address).trim(),
                    companyId: String(companyId)
                }
            }
        });
        if (!houseExists) {
            return res.status(400).json({ 
                error: 'Указанный адрес не обслуживается нашей управляющей компанией' 
            });
        }

        const newTicket = await prisma.ticket.create({
        data: {
            address,
            description,
            type,
            status: 'new',
            company: {
            connect: { id: companyId }
            }
        }
        });

        return res.status(201).json(newTicket);
    } catch (error) {
        console.error('Ошибка при создании заявки:', error);
        return res.status(500).json({ error: 'Не удалось сохранить заявку в базу' });
    }
});

router.post('/assign', async (req: Request, res: Response): Promise<any> => {
    const { ticketId, masterId } = req.body;

    if (!ticketId || !masterId) {
        return res.status(400).json({ error: 'Необходимо передать ticketId и masterId' });
    }

    try {
        // Обновляем тикет в базе
        const updatedTicket = await prisma.ticket.update({
            where: { id: Number(ticketId) },
            data: {
                masterId: Number(masterId),
                status: 'new', // Оставляем 'new', чтобы мастер сам нажал "Принять"
                assignedAt: new Date()
                    }
        });

        return res.json({ success: true, ticket: updatedTicket });
    } catch (error) {
        console.error('Ошибка при назначении мастера:', error);
        return res.status(500).json({ error: 'Не удалось назначить мастера' });
    }
});

router.post('/master/accept', async (req: Request, res: Response): Promise<any> => {
    const { ticketId, masterId } = req.body;

    if (!ticketId || !masterId) {
        return res.status(400).json({ error: 'Необходимо передать ticketId и masterId' });
    }

    try {
        const ticket = await prisma.ticket.update({
            where: { id: Number(ticketId) },
            data: {
                status: 'in_work',
                masterId: Number(masterId) // На случай, если мастер берет неназначенную заявку сам
            }
        });

        return res.json({ success: true, ticket });
    } catch (error) {
        console.error('Ошибка при принятии заявки мастером:', error);
        return res.status(500).json({ error: 'Не удалось обновить статус' });
    }
});

router.post('/master/complete', async (req: Request, res: Response): Promise<any> => {
    const { ticketId, masterId } = req.body;

    if (!ticketId || !masterId) {
        return res.status(400).json({ error: 'Необходимо передать ticketId и masterId' });
    }

    try {
        // Дополнительная проверка, чтобы заявку мог закрыть только тот мастер, который на ней висит
        const existingTicket = await prisma.ticket.findUnique({ where: { id: Number(ticketId) } });
        
        if (existingTicket?.masterId !== Number(masterId)) {
            return res.status(403).json({ error: 'Вы не можете завершить чужую заявку' });
        }

        const ticket = await prisma.ticket.update({
            where: { id: Number(ticketId) },
            data: {
                status: 'completed',
                completedAt: new Date() // Фиксируем время завершения
            }
        });

        return res.json({ success: true, ticket });
    } catch (error) {
        console.error('Ошибка при завершении заявки мастером:', error);
        return res.status(500).json({ error: 'Не удалось завершить заявку' });
    }
});

router.post('/dispatcher/close', async (req: Request, res: Response): Promise<any> => {
    const { ticketId } = req.body;

    if (!ticketId) {
        return res.status(400).json({ error: 'Необходимо передать ticketId' });
    }

    try {
        const ticket = await prisma.ticket.update({
            where: { id: Number(ticketId) },
            data: {
                status: 'completed',
                completedAt: new Date() // Фиксируем время закрытия
                // Поля tenantRating и tenantComment оставляем нетронутыми, их заполнит жилец
            }
        });

        return res.json({ success: true, ticket });
    } catch (error) {
        console.error('Ошибка при закрытии заявки диспетчером:', error);
        return res.status(500).json({ error: 'Не удалось закрыть заявку' });
    }
});

router.post('/tilda-direct-ticket', async (req: Request, res: Response): Promise<any> => {
    try {
        const { address, description, type, companyId } = req.body;
        
        // Генерируем 16-значный токен для ссылки
        const trackingToken = crypto.randomBytes(8).toString('hex');

        const newTicket = await prisma.ticket.create({
            data: {
                address,
                description,
                type: type || 'regular',
                status: 'new',
                companyId, // Должен передаваться из формы (например 'crocus' или 'meridian')
                trackingToken
            }
        });

        // Формируем ссылку (замени localhost на свой будущий реальный домен фронтенда)
        const trackingLink = `http://localhost:5173/status/${trackingToken}`;

        // Возвращаем ссылку фронтенду Тильды
        return res.status(200).json({ 
            success: true, 
            trackingLink: trackingLink 
        }); 
    } catch (error) {
        console.error('Ошибка при создании заявки с Тильды:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// блок с get
router.get('/my', async (req: Request, res: Response): Promise<any> => {
    try {
        const { companyId, masterId, status } = req.query;

        // Для мастера обязательно знать его ID и компанию
        if (!companyId || !masterId) {
            return res.status(400).json({ error: 'Параметры companyId и masterId обязательны' });
        }

        const whereClause: any = {
            companyId: String(companyId),
            masterId: parseInt(masterId as string) // Жестко фильтруем только по этому мастеру
        };

        // Если Петрович хочет посмотреть только активные 'in_work' или только выполненные 'completed'
        if (status) {
            whereClause.status = String(status);
        } else {
            // По умолчанию на рабочем столе мастера лучше не показывать старый архив,
            // а выводить только то, что надо делать прямо сейчас
            whereClause.status = { in: ['new', 'in_work'] }; 
        }

        const myTickets = await prisma.ticket.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc' // Свежие аварии — в самый верх списка
            }
        });

        return res.json({ tickets: myTickets });
    } catch (error) {
        console.error('Ошибка при получении заявок мастера:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

router.get('/', async (req: Request, res: Response) =>  {
    try {
        const { companyId, masterId, status, type } = req.query;

        if (!companyId) {
            res.status(400).json({ error: 'Параметр companyId обязателен' });
            return;
        }

        const whereClause: any = {
            companyId: String(companyId)
        };

        if (masterId === 'null') {
            whereClause.masterId = null;
        } else if (masterId) {
            whereClause.masterId = parseInt(masterId as string);
        }
        if (status) {
            whereClause.status = String(status);
        }
        if (type) {
            whereClause.type = "emergency";
        }

        const tickets = await prisma.ticket.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({ tickets })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

export default router;