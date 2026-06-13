import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { postId, userId } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const existing = await sql`SELECT * FROM likes WHERE post_id = ${postId} AND user_id = ${userId}`;
    if (existing.length) {
        await sql`DELETE FROM likes WHERE post_id = ${postId} AND user_id = ${userId}`;
    } else {
        await sql`INSERT INTO likes (post_id, user_id) VALUES (${postId}, ${userId})`;
    }
    res.status(200).json({ success: true });
}
