import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }

    const { firstName, lastName, phone, password } = req.body;
    const name = `${firstName} ${lastName}`;

    if (!firstName || !lastName || !phone || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: 'Ошибка конфигурации базы данных' });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);
        
        const existing = await sql`SELECT * FROM users WHERE phone = ${phone}`;
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Такой номер уже зарегистрирован' });
        }

        const [user] = await sql`
            INSERT INTO users (name, phone, password) 
            VALUES (${name}, ${phone}, ${password}) 
            RETURNING id, name, phone
        `;

        res.status(200).json({
            id: user.id,
            name: user.name,
            phone: user.phone
        });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
}
