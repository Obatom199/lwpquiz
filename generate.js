// Netlify function: writes quiz questions with Claude. Only a logged-in admin can call it.
// Environment variables (Netlify > Site settings > Environment variables):
//   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY   (optional: CLAUDE_MODEL)
const reply = (code, obj) => ({ statusCode: code, headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST only' });
  const token = (event.headers.authorization || '').replace(/^Bearer /i, '');
  const who = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
    headers: { Authorization: 'Bearer ' + token, apikey: process.env.SUPABASE_ANON_KEY } });
  if (!who.ok) return reply(401, { error: 'Please log in again.' });

  let b = {}; try { b = JSON.parse(event.body); } catch {}
  const n = Math.min(Math.max(parseInt(b.count) || 10, 1), 20);
  const topic = String(b.topic || '').trim().slice(0, 200) || 'a fun mix of well-known Bible stories, people and verses';
  const level = ['Easy', 'Medium', 'Hard'].includes(b.level) ? b.level : 'Medium';
  const prompt = `Write ${n} multiple-choice quiz questions for a church youth fellowship (ages 13 to 25). Topic: ${topic}. Difficulty: ${level}.
Rules:
- One question per line, exactly in this format: Question | Option A | Option B | Option C | Option D | N
- N is the number (1 to 4) of the correct option. Spread the correct answers across all positions.
- Keep questions under 120 characters and options short.
- Be biblically accurate. If you are unsure of a fact, pick a different question.
- At most two true/false questions, written as: Statement | True | False | N
- Never use the | character inside a question or option. No numbering, no markdown, no extra text.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-haiku-5-5', max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return reply(502, { error: (d.error && d.error.message) || 'The AI request failed.' });
  const text = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n')
    .split('\n').map(l => l.trim()).filter(l => l.split('|').length >= 4).join('\n');
  return reply(200, { text });
};
