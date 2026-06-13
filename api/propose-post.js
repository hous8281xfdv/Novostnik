import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { title, content, imageUrl, authorId, authorName } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    await sql`INSERT INTO pending_posts (title, content, image_url, author_id, author_name) VALUES (${title}, ${content}, ${imageUrl}, ${authorId}, ${authorName})`;
    res.status(200).json({ success: true });
}
