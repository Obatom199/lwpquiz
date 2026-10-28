import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// PASTE YOUR SUPABASE SETTINGS HERE (Project settings > API). Use the anon public key only.
export const CONFIG = { url: "https://reohhfxampitibotuwlm.supabase.co", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb2hoZnhhbXBpdGlib3R1d2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODMxNDIsImV4cCI6MjEwODc1OTE0Mn0.LKbhrUrzABV7u6y9Pr1UmkESY0FAEVjDOan2InGdmk8" };
export const QTIME = 12000, REVEAL = 5000, MAXPTS = 1000, MINPTS = 100;

export const $ = s => document.querySelector(s);
export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const ready = CONFIG.url.startsWith('https');
export const sb = ready ? createClient(CONFIG.url, CONFIG.key) : null;
export const S = { code: '', G: {}, off: 0, loaded: false };
export const A = 'ABCD';

export const players = () => Object.values(S.G.players || {}).sort((a, b) => b.score - a.score);
export const srv = async () => Number((await sb.rpc('lq_server_ms')).data);
export async function sync() { const t0 = Date.now(), s = await srv(); S.off = s - (t0 + Date.now()) / 2; }

let ch;
export function listen(code, draw) {
  S.code = code; S.loaded = false;
  if (ch) sb.removeChannel(ch);
  const load = async () => {
    if (S.code !== code) return;
    const [g, p, a] = await Promise.all([
      sb.from('lq_games').select('state').eq('code', code).maybeSingle(),
      sb.from('lq_players').select('*').eq('code', code),
      sb.from('lq_answers').select('*').eq('code', code)]);
    S.G = { state: g.data && g.data.state,
      players: Object.fromEntries((p.data || []).map(x => [x.id, x])),
      ans: Object.fromEntries((a.data || []).map(x => [x.pid, x])) };
    S.loaded = true; draw();
  };
  let tm; const kick = () => { clearTimeout(tm); tm = setTimeout(load, 120); };
  ch = sb.channel('q' + code);
  ['lq_games', 'lq_players', 'lq_answers'].forEach(t => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, kick));
  ch.subscribe(); load();
}
const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1) + '.';
export const board = n => players().slice(0, n).map((x, i) =>
  `<div class="row r${i}"><span>${medal(i)} ${esc(x.name)}</span><b>${x.score}</b></div>`).join('') || '<p class="hint">No players yet</p>';
export const setup = msg => { $('#app').innerHTML = `<div class="card"><h2>Almost ready</h2>${msg}</div>`; };

setInterval(() => {
  const s = S.G.state;
  if (!s || s.phase !== 'question' || !s.start) return;
  const t = Math.max(0, s.start + QTIME - (Date.now() + S.off)), b = $('#bar'), c = $('#cnt');
  if (b) b.style.width = (100 * t / QTIME) + '%';
  if (c) c.textContent = Math.ceil(t / 1000) + 's';
}, 100);
