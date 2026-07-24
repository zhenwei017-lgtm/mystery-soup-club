import { env } from "cloudflare:workers";

export type StoredKeyFact = { id: string; description: string; weight: number };
export type StoredSoup = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  time: string;
  surface: string;
  truth: string;
  hint: string;
  keyFacts: StoredKeyFact[];
};

async function ensureTable() {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS custom_soups (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT '新作',
      play_time TEXT NOT NULL DEFAULT '约 10 分钟',
      surface TEXT NOT NULL,
      truth TEXT NOT NULL,
      hint TEXT NOT NULL,
      key_facts TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `).run();
}

function fromRow(row: Record<string, unknown>): StoredSoup {
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category),
    difficulty: String(row.difficulty),
    time: String(row.play_time),
    surface: String(row.surface),
    truth: String(row.truth),
    hint: String(row.hint),
    keyFacts: JSON.parse(String(row.key_facts)),
  };
}

export async function createSoupDraft(input: {
  title: string;
  category: string;
  surface: string;
  truth: string;
  hint: string;
  keyFacts: StoredKeyFact[];
}) {
  await ensureTable();
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO custom_soups
      (id, title, category, difficulty, play_time, surface, truth, hint, key_facts, is_public, created_at)
    VALUES (?, ?, ?, '新作', '约 10 分钟', ?, ?, ?, ?, 0, ?)
  `).bind(
    id,
    input.title,
    input.category,
    input.surface,
    input.truth,
    input.hint,
    JSON.stringify(input.keyFacts),
    Date.now(),
  ).run();
  return id;
}

export async function publishSoupDraft(id: string, input: { title: string; category: string; surface: string }) {
  await ensureTable();
  const result = await env.DB.prepare(`
    UPDATE custom_soups
    SET title = ?, category = ?, surface = ?, is_public = 1
    WHERE id = ?
  `).bind(input.title, input.category, input.surface, id).run();
  return Boolean(result.meta.changes);
}

export async function getStoredSoup(id: string) {
  await ensureTable();
  const row = await env.DB.prepare("SELECT * FROM custom_soups WHERE id = ?").bind(id).first();
  return row ? fromRow(row as Record<string, unknown>) : null;
}

export async function listPublicSoups() {
  await ensureTable();
  const result = await env.DB.prepare(`
    SELECT id, title, category, difficulty, play_time, surface
    FROM custom_soups
    WHERE is_public = 1
    ORDER BY created_at DESC
    LIMIT 100
  `).all();
  return result.results.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    category: String(row.category),
    difficulty: String(row.difficulty),
    time: String(row.play_time),
    surface: String(row.surface),
    accent: "#875844",
  }));
}
