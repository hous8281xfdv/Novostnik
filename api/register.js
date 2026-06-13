import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Разрешаем только POST-запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }

    const { name, phone, password } = req.body;

    // Проверка обязательных полей
    if (!name || !phone || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Подключаемся к базе
    const sql = neon(process.env.DATABASE_URL);

    try {
        // Проверяем, существует ли пользователь с таким телефоном
        const existing = await sql`
            SELECT * FROM users WHERE phone = ${phone}
        `;

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким номером уже зарегистрирован' });
        }

        // Создаём нового пользователя
        const [user] = await sql`
            INSERT INTO users (name, phone, password) 
            VALUES (${name}, ${phone}, ${password}) 
            RETURNING id, name, phone
        `;

        // Возвращаем данные пользователя (без пароля)
        res.status(200).json({
            id: user.id,
            name: user.name,
            phone: user.phone
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message });
    }
}
