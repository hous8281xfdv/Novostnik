import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { name, phone, password } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const existing = await sql`SELECT * FROM users WHERE phone = ${phone}`;
    if (existing.length) return res.status(400).json({ error: 'User exists' });
    const [user] = await sql`INSERT INTO users (name, phone, password) VALUES (${name}, ${phone}, ${password}) RETURNING id, name, phone`;
    res.status(200).json(user);
}
