import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { postId } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM comments WHERE post_id = ${postId}`;
    await sql`DELETE FROM likes WHERE post_id = ${postId}`;
    await sql`DELETE FROM posts WHERE id = ${postId}`;
    res.status(200).json({ success: true });
}
