import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { postId, userId, text } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const [user] = await sql`SELECT name FROM users WHERE id = ${userId}`;
    await sql`INSERT INTO comments (post_id, user_id, author_name, text) VALUES (${postId}, ${userId}, ${user.name}, ${text})`;
    res.status(200).json({ success: true });
}
