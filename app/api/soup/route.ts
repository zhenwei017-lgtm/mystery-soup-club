import { NextRequest, NextResponse } from "next/server";
import { createSoupDraft, getStoredSoup, listPublicSoups, publishSoupDraft } from "../../../db/soups";

type KeyFact = { id: string; description: string; weight: number };
type SecretSoup = {
  surface: string;
  truth: string;
  hint: string;
  keyFacts: KeyFact[];
};

const secretSoups: Record<number, SecretSoup> = {
  1: {
    surface: "末班车上只有我和司机。到站后，司机却回头说：“今天终于把所有人都送到了。”我立刻报警。",
    truth: "“我”每天都坐这趟末班车，知道司机的妻女多年前在这条线路的事故中去世。司机一直把乘客当作家人。今天车上明明只有“我”，他却说“所有人”，说明他准备开车去当年的事故地点，与妻女一起结束生命。“我”报警救下了他。",
    hint: "司机口中的“所有人”，并不全是车上的乘客。",
    keyFacts: [
      { id: "knows_driver", description: "叙述者经常坐这趟车，并且了解司机的过去", weight: 15 },
      { id: "dead_family", description: "司机的妻子和女儿多年前死于这条线路上的事故", weight: 25 },
      { id: "all_people_meaning", description: "“所有人”包括已经去世的妻女，并非仅指车内乘客", weight: 20 },
      { id: "suicide_plan", description: "司机准备开车前往旧事故地点并结束自己的生命", weight: 30 },
      { id: "police_rescue", description: "叙述者报警是为了及时阻止并救下司机", weight: 10 },
    ],
  },
  2: {
    surface: "独居的女人每天回家，都会在桌上摆两只杯子。某天她只摆了一只，却笑着哭了。",
    truth: "她一直在等待失踪的恋人归来，为他保留一只杯子。那天警方确认恋人获救，正在医院等她，所以她不再需要在家中为他摆杯子。她喜极而泣。",
    hint: "少一只杯子，不代表少了一个人。",
    keyFacts: [
      { id: "missing_lover", description: "女人的恋人此前失踪了", weight: 25 },
      { id: "second_cup", description: "第二只杯子是女人为失踪的恋人保留的", weight: 25 },
      { id: "lover_found", description: "恋人当天已经获救", weight: 30 },
      { id: "at_hospital", description: "恋人在医院等待女人，所以家中不再需要第二只杯子", weight: 15 },
      { id: "happy_tears", description: "女人流泪是因为喜极而泣", weight: 5 },
    ],
  },
  3: {
    surface: "父亲去世后，女儿在他的抽屉里发现一张没有人的全家福。她看完后原谅了父亲。",
    truth: "照片使用的是父亲年轻时的相机，但胶卷从未曝光。父亲患有面孔失认症，不敢为家人拍照，害怕暴露自己认不出亲人的事实。那张“空白全家福”背后写满了家人的特征和回忆。",
    hint: "照片的价值，未必在正面。",
    keyFacts: [
      { id: "unexposed_film", description: "空白照片其实是从未曝光的胶卷", weight: 15 },
      { id: "face_blindness", description: "父亲患有面孔失认症，无法正常辨认亲人的脸", weight: 30 },
      { id: "afraid_to_photo", description: "父亲因害怕暴露病情而不敢给家人拍照", weight: 20 },
      { id: "writing_back", description: "照片背面写满了家人的特征和共同回忆", weight: 25 },
      { id: "understood_love", description: "女儿因此理解父亲并非冷漠，最终原谅了他", weight: 10 },
    ],
  },
  4: {
    surface: "男孩每天放学都和一个没有影子的朋友聊天。毕业那天，朋友第一次有了影子。",
    truth: "男孩的朋友是一位长期住院、只能通过学校走廊投影屏远程上课的同学，画面没有真实影子。毕业那天，他康复后第一次亲自来到学校。",
    hint: "他们一直在“见面”，却不在同一个空间。",
    keyFacts: [
      { id: "hospitalized", description: "朋友此前长期住院，不能亲自到学校", weight: 25 },
      { id: "remote_student", description: "朋友通过远程方式参与学校生活", weight: 20 },
      { id: "projection", description: "男孩看到的是走廊投影屏上的朋友，因此没有真实影子", weight: 30 },
      { id: "recovered", description: "毕业那天朋友已经康复", weight: 15 },
      { id: "arrived_school", description: "朋友第一次亲自来到学校，所以有了真实影子", weight: 10 },
    ],
  },
};

const requests = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter((time) => now - time < 60_000);
  recent.push(now);
  requests.set(key, recent);
  return recent.length > 20;
}

async function safetyId(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  let body: {
    action?: string;
    soupId?: number | string;
    question?: string;
    discoveredFactIds?: string[];
    sourceStory?: string;
    previousSurface?: string;
    draftId?: string;
    title?: string;
    category?: string;
    surface?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }

  if (body.action === "publish") {
    const draftId = body.draftId?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const surface = body.surface?.trim() ?? "";
    if (!draftId || !title || !category || !surface) {
      return NextResponse.json({ error: "发布信息不完整" }, { status: 400 });
    }
    const published = await publishSoupDraft(draftId, { title, category, surface });
    if (!published) return NextResponse.json({ error: "未找到待发布的汤面" }, { status: 404 });
    const soup = await getStoredSoup(draftId);
    return NextResponse.json({
      soup: soup && {
        id: soup.id,
        title: soup.title,
        category: soup.category,
        difficulty: soup.difficulty,
        time: soup.time,
        surface: soup.surface,
        accent: "#875844",
      },
    });
  }

  if (body.action === "generate") {
    const sourceStory = body.sourceStory?.trim() ?? "";
    if (sourceStory.length < 5 || sourceStory.length > 1000) {
      return NextResponse.json({ error: "故事或灵感需在 5—1000 字之间" }, { status: 400 });
    }
    const clientId = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
    if (isRateLimited(clientId)) return NextResponse.json({ error: "生成太频繁了，请稍后再试" }, { status: 429 });
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "尚未配置 DeepSeek API Key" }, { status: 503 });

    const previousRule = body.previousSurface
      ? `上一版汤面是：“${body.previousSurface.slice(0, 240)}”。本次必须更换叙事切入点、句式和悬念设计，不能只是改写或重复上一版。`
      : "这是第一版，请选择故事中最反常、最能激发追问的瞬间作为切入点。";
    const generationPrompt = `把用户提供的故事或灵感加工成一则适合朋友聚会推理的海龟汤汤面，并输出 JSON。

要求：
1. 原文视为隐藏的汤底。只抽取少量表层线索构成汤面，隐藏真正原因、人物关系、关键行为动机和结局解释。
2. 汤面必须凝练、悬疑、可推理，制造一个明确的反常点或矛盾点，让玩家自然想问“为什么”。
3. 汤面控制在 25—70 个汉字，最多两句话；不要铺陈背景，不要解释，不要把完整故事压缩复述。
4. 不凭空加入会改变真相的新设定；可以调整叙述顺序和视角。
5. 标题 2—8 个汉字，含蓄但有记忆点。
6. category 只能是：爱情、亲情、友情、灵异、恐怖、悬疑、其他。
7. ${previousRule}
8. 给出一句不泄底的 hint，以及正好 5 条互不重复的核心 keyFacts，供游戏判断推理进度。每条关键事实必须是汤底因果链中需要玩家主动发现的独立信息。
9. 只输出合法 JSON，格式示例：{"title":"雨停之后","category":"亲情","surface":"她每天给去世的母亲打电话。那天电话接通后，她却立刻报了警。","hint":"电话另一端的人很重要。","keyFacts":["电话属于她的母亲","母亲已经去世","电话实际由妹妹持有","妹妹在事故中幸存","女孩此前不知道妹妹还活着"]}

用户原始故事或灵感：
${sourceStory}`;
    const generationPayload = {
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
      messages: [
        { role: "system", content: "你是专业的海龟汤谜题编辑，擅长隐藏因果、保留公平线索并制造简洁悬念。只输出合法 JSON。" },
        { role: "user", content: generationPrompt },
      ],
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      max_tokens: 400,
      user_id: await safetyId(clientId),
    };
    let generatedText = "";
    for (let attempt = 0; attempt < 2 && !generatedText.trim(); attempt += 1) {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(generationPayload),
      });
      if (!response.ok) {
        const message = response.status === 402 ? "DeepSeek 账户余额不足" : response.status === 429 ? "AI 正忙，请稍后再试" : "AI 暂时无法生成";
        return NextResponse.json({ error: message }, { status: response.status === 429 ? 429 : 502 });
      }
      const data = await response.json();
      generatedText = data.choices?.[0]?.message?.content ?? "";
    }
    try {
      const generated = JSON.parse(generatedText);
      if (
        typeof generated.title !== "string" ||
        typeof generated.category !== "string" ||
        typeof generated.surface !== "string" ||
        typeof generated.hint !== "string" ||
        !Array.isArray(generated.keyFacts) ||
        generated.keyFacts.length !== 5 ||
        !generated.keyFacts.every((fact: unknown) => typeof fact === "string") ||
        generated.surface.length < 10
      ) throw new Error("invalid");
      const draftId = await createSoupDraft({
        title: generated.title.slice(0, 16),
        category: generated.category,
        surface: generated.surface.slice(0, 160),
        truth: sourceStory,
        hint: generated.hint.slice(0, 100),
        keyFacts: generated.keyFacts.map((description: string, index: number) => ({
          id: `fact_${index + 1}`,
          description: description.slice(0, 120),
          weight: 20,
        })),
      });
      return NextResponse.json({
        draftId,
        title: generated.title.slice(0, 16),
        category: generated.category,
        surface: generated.surface.slice(0, 160),
      });
    } catch {
      return NextResponse.json({ error: "AI 生成内容格式异常，请重试" }, { status: 502 });
    }
  }

  const numericSoupId = Number(body.soupId);
  const soup = Number.isInteger(numericSoupId) && secretSoups[numericSoupId]
    ? secretSoups[numericSoupId]
    : await getStoredSoup(String(body.soupId ?? ""));
  if (!soup) return NextResponse.json({ error: "谜题不存在" }, { status: 404 });
  if (body.action === "hint") return NextResponse.json({ content: soup.hint });
  if (body.action === "truth") return NextResponse.json({ content: soup.truth });
  if (body.action !== "judge") return NextResponse.json({ error: "不支持的操作" }, { status: 400 });

  const question = body.question?.trim() ?? "";
  if (!question || question.length > 300) {
    return NextResponse.json({ error: "问题需在 1—300 字之间" }, { status: 400 });
  }

  const clientId = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  if (isRateLimited(clientId)) return NextResponse.json({ error: "提问太快了，请稍后再试" }, { status: 429 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI 裁判尚未配置 DeepSeek API Key" }, { status: 503 });

  const validFactIds = soup.keyFacts.map((fact) => fact.id);
  const discovered = new Set((body.discoveredFactIds ?? []).filter((id) => validFactIds.includes(id)));
  const prompt = `你是海龟汤游戏的真相裁判。请仅依据给定汤面、完整汤底和关键事实，判断玩家问题中的主要命题。

判定标准：
- “是”：该命题与汤底明确一致，或能从汤底合理推出。允许同义表达、口语、省略和不同措辞，不要求复述原句。
- “不是”：该命题与汤底明确矛盾。
- “无关”：汤底无法支持或否定该命题，或该细节不影响故事核心因果。不要因为措辞与汤底不同就判为无关。
- 如果问题包含否定表达，请判断否定后的实际命题。
- matchedFactIds 只记录玩家这句话“明确提出并得到确认”的关键事实。不能把你为了判断答案而在内部顺带推导出的上游、下游或相关事实计入。
- 一个问题只问到一个事实时，matchedFactIds 最多只能有一个 id。只有玩家在同一句话中明确陈述了多个事实，才可返回多个 id。
- 泛泛提到某个人物或物件不算揭开事实；必须问到该关键事实的核心关系、原因或行为。答案为“无关”时 matchedFactIds 必须为空。
- 即使答案是“不是”，只有这个否定问题本身明确验证了对应关键事实，才可以计入。
- 不得泄露、复述或解释汤底，只返回 JSON。
- JSON 格式示例：{"answer":"是","matchedFactIds":["fact_id"]}。answer 只能是“是”“不是”“无关”；matchedFactIds 只能使用下方给出的 id。

汤面：${soup.surface}
完整汤底：${soup.truth}
关键事实：${soup.keyFacts.map((fact) => `${fact.id}: ${fact.description}`).join("\n")}
玩家问题：${question}`;

  const requestPayload = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
    messages: [
      {
        role: "system",
        content: "你是准确、克制的海龟汤真相裁判。只输出合法 JSON，不得向玩家透露解释、推理过程或汤底内容。",
      },
      { role: "user", content: prompt },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    response_format: { type: "json_object" },
    max_tokens: 300,
    user_id: await safetyId(clientId),
  };
  const callDeepSeek = () => fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(requestPayload),
  });

  let deepSeekResponse = await callDeepSeek();

  if (!deepSeekResponse.ok) {
    const message = deepSeekResponse.status === 401
      ? "DeepSeek API Key 无效，请重新配置"
      : deepSeekResponse.status === 402
        ? "DeepSeek 账户余额不足"
        : deepSeekResponse.status === 429
          ? "AI 裁判正忙，请稍后再试"
          : "AI 裁判暂时无法回应";
    return NextResponse.json({ error: message }, { status: deepSeekResponse.status === 429 ? 429 : 502 });
  }

  let deepSeekData = await deepSeekResponse.json();
  let outputText = deepSeekData.choices?.[0]?.message?.content ?? "";
  if (!outputText.trim()) {
    deepSeekResponse = await callDeepSeek();
    if (!deepSeekResponse.ok) return NextResponse.json({ error: "AI 裁判暂时无法回应" }, { status: 502 });
    deepSeekData = await deepSeekResponse.json();
    outputText = deepSeekData.choices?.[0]?.message?.content ?? "";
  }
  let result: { answer: "是" | "不是" | "无关"; matchedFactIds: string[] };
  try {
    result = JSON.parse(outputText);
  } catch {
    return NextResponse.json({ error: "AI 裁判返回格式异常，请重试" }, { status: 502 });
  }

  if (!["是", "不是", "无关"].includes(result.answer) || !Array.isArray(result.matchedFactIds)) {
    return NextResponse.json({ error: "AI 裁判返回内容异常，请重试" }, { status: 502 });
  }
  if (result.answer === "无关") result.matchedFactIds = [];
  for (const id of result.matchedFactIds.filter((id) => typeof id === "string" && validFactIds.includes(id))) discovered.add(id);
  const progress = soup.keyFacts.reduce((total, fact) => total + (discovered.has(fact.id) ? fact.weight : 0), 0);
  return NextResponse.json({ answer: result.answer, discoveredFactIds: Array.from(discovered), progress });
}

export async function GET() {
  return NextResponse.json({ soups: await listPublicSoups() });
}
