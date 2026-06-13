import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { postId } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const [pending] = await sql`SELECT * FROM pending_posts WHERE id = ${postId}`;
    if (pending) {
        await sql`INSERT INTO posts (title, content, image_url, author_id, author_name, status) VALUES (${pending.title}, ${pending.content}, ${pending.image_url}, ${pending.author_id}, ${pending.author_name}, 'approved')`;
        await sql`DELETE FROM pending_posts WHERE id = ${postId}`;
    }
    res.status(200).json({ success: true });
}
