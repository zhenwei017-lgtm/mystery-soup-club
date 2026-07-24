"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Soup = {
  id: number | string;
  title: string;
  category: string;
  difficulty: string;
  time: string;
  surface: string;
  accent: string;
};

const soups: Soup[] = [
  {
    id: 1,
    title: "午夜末班车",
    category: "灵异",
    difficulty: "进阶",
    time: "约 15 分钟",
    surface: "末班车上只有我和司机。到站后，司机却回头说：“今天终于把所有人都送到了。”我立刻报警。",
    accent: "#b94e45",
  },
  {
    id: 2,
    title: "第二只杯子",
    category: "爱情",
    difficulty: "入门",
    time: "约 8 分钟",
    surface: "独居的女人每天回家，都会在桌上摆两只杯子。某天她只摆了一只，却笑着哭了。",
    accent: "#997141",
  },
  {
    id: 3,
    title: "空白的全家福",
    category: "亲情",
    difficulty: "烧脑",
    time: "约 20 分钟",
    surface: "父亲去世后，女儿在他的抽屉里发现一张没有人的全家福。她看完后原谅了父亲。",
    accent: "#587570",
  },
  {
    id: 4,
    title: "没有影子的朋友",
    category: "友情",
    difficulty: "进阶",
    time: "约 12 分钟",
    surface: "男孩每天放学都和一个没有影子的朋友聊天。毕业那天，朋友第一次有了影子。",
    accent: "#64726a",
  },
];

const categories = ["全部", "爱情", "亲情", "友情", "灵异", "恐怖"];

export default function Home() {
  const [mode, setMode] = useState<"play" | "create">("play");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [selected, setSelected] = useState(soups[0]);
  const [customSoups, setCustomSoups] = useState<Soup[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { from: "judge", text: "案卷已开启。请提出只能用“是 / 不是 / 无关”回答的问题。", answer: "" },
  ]);
  const [progress, setProgress] = useState(0);
  const [discoveredFactIds, setDiscoveredFactIds] = useState<string[]>([]);
  const [isJudging, setIsJudging] = useState(false);
  const [modal, setModal] = useState<"hint" | "truth" | "badge" | null>(null);
  const [modalContent, setModalContent] = useState("");
  const [isLoadingClue, setIsLoadingClue] = useState(false);
  const [draft, setDraft] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState("雨停之后");
  const [generatedCategory, setGeneratedCategory] = useState("亲情");
  const [generatedSurface, setGeneratedSurface] = useState("");
  const [generatedDraftId, setGeneratedDraftId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [publicAllowed, setPublicAllowed] = useState(true);
  const [toast, setToast] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => [...customSoups, ...soups].filter((s) => activeCategory === "全部" || s.category === activeCategory),
    [activeCategory, customSoups],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isJudging]);

  useEffect(() => {
    let active = true;
    fetch("/api/soup")
      .then((response) => response.json())
      .then((data) => {
        if (active && Array.isArray(data.soups)) setCustomSoups(data.soups);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  function chooseSoup(soup: Soup) {
    setSelected(soup);
    setMessages([{ from: "judge", text: "案卷已开启。请开始你的推理。", answer: "" }]);
    setProgress(0);
    setDiscoveredFactIds([]);
    setModal(null);
  }

  async function ask(e: FormEvent) {
    e.preventDefault();
    const clean = question.trim();
    if (!clean || isJudging) return;
    setMessages((old) => [...old, { from: "user", text: clean, answer: "" }]);
    setQuestion("");
    setIsJudging(true);
    try {
      const response = await fetch("/api/soup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "judge", soupId: selected.id, question: clean, discoveredFactIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI 裁判暂时无法回应");
      setMessages((old) => [...old, { from: "judge", text: data.answer, answer: data.answer }]);
      setDiscoveredFactIds(data.discoveredFactIds);
      setProgress(data.progress);
      if (data.progress === 100) setTimeout(() => setModal("badge"), 400);
    } catch (error) {
      const text = error instanceof Error ? error.message : "AI 裁判暂时无法回应";
      setMessages((old) => [...old, { from: "judge", text, answer: "" }]);
    } finally {
      setIsJudging(false);
    }
  }

  async function openClue(type: "hint" | "truth") {
    setModal(type);
    setModalContent("");
    setIsLoadingClue(true);
    try {
      const response = await fetch("/api/soup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type, soupId: selected.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "内容加载失败");
      setModalContent(data.content);
    } catch (error) {
      setModalContent(error instanceof Error ? error.message : "内容加载失败");
    } finally {
      setIsLoadingClue(false);
    }
  }

  async function generateSoup() {
    if (!draft.trim()) {
      setToast("先写下一点故事或灵感");
      setTimeout(() => setToast(""), 2200);
      return;
    }
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/soup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          sourceStory: draft.trim(),
          previousSurface: generated ? generatedSurface : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI 暂时无法生成");
      setGeneratedTitle(data.title);
      setGeneratedCategory(data.category);
      setGeneratedSurface(data.surface);
      setGeneratedDraftId(data.draftId);
      setGenerated(true);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "AI 暂时无法生成");
      setTimeout(() => setToast(""), 2600);
    } finally {
      setIsGenerating(false);
    }
  }

  async function publish() {
    if (!publicAllowed) {
      setToast("已保留这份专属汤面");
      setTimeout(() => setToast(""), 2600);
      return;
    }
    try {
      const response = await fetch("/api/soup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          draftId: generatedDraftId,
          title: generatedTitle,
          category: generatedCategory,
          surface: generatedSurface,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.soup) throw new Error(data.error || "收录失败");
      setCustomSoups((old) => [data.soup, ...old.filter((item) => item.id !== data.soup.id)]);
      setMode("play");
      setActiveCategory("全部");
      chooseSoup(data.soup);
      setToast("已收录进公开案卷库，现在可以开始推理");
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "收录失败");
      setTimeout(() => setToast(""), 2600);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setMode("play")} aria-label="返回首页">
          <span className="brand-mark"><i /></span>
          <span><strong>谜雾汤馆</strong><small>MYSTERY SOUP CLUB</small></span>
        </button>
        <nav aria-label="主要导航">
          <button className={mode === "play" ? "active" : ""} onClick={() => setMode("play")}>推理汤底</button>
          <button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>自定义汤面</button>
        </nav>
        <div className="top-actions">
          <button className="daily-chip" onClick={() => { setMode("play"); chooseSoup(soups[0]); }}>
            <span>✦</span> 今日谜题
          </button>
        </div>
      </header>

      {mode === "play" ? (
        <div className="play-page">
          <aside className="case-library">
            <div className="library-heading">
              <span className="eyebrow">CASE ARCHIVE · 案卷库</span>
              <h1>今晚，<em>真相</em>藏在哪里？</h1>
              <p>挑一桩离奇事件，和朋友一起叩问真相。</p>
            </div>
            <div className="category-tabs" aria-label="谜题分类">
              {categories.map((category) => (
                <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>
              ))}
            </div>
            <div className="case-list">
              {filtered.map((soup, index) => (
                <button className={`case-card ${selected.id === soup.id ? "selected" : ""}`} key={soup.id} onClick={() => chooseSoup(soup)}>
                  <span className="case-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="case-copy">
                    <span className="tags"><i style={{ background: soup.accent }}>{soup.category}</i><i>{soup.difficulty}</i></span>
                    <strong>{soup.title}</strong>
                    <small>⌛ {soup.time}</small>
                  </span>
                  <span className="folder-corner" />
                </button>
              ))}
            </div>
          </aside>

          <section className="investigation-room">
            <div className="case-toolbar">
              <div><span className="status-dot" /> 案卷调查中 <i>{typeof selected.id === "number" ? `CASE 0${selected.id}` : "玩家新作"}</i></div>
            </div>

            <div className="case-file">
              <div className="paperclip" />
              <div className="case-meta">
                <span>{selected.category} · {selected.difficulty}</span>
                <span>建议 {selected.time.replace("约 ", "")}</span>
              </div>
              <span className="file-label">汤 面</span>
              <h2>{selected.title}</h2>
              <p>“{selected.surface}”</p>
              <div className="red-stamp">绝密<br /><small>TOP SECRET</small></div>
            </div>

            <div className="progress-block">
              <div className="progress-top">
                <span>推理还原度</span>
                <strong>{progress}<small>%</small></strong>
              </div>
              <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
              <p>{progress < 30 ? "迷雾尚浓，试着从人物关系开始。" : progress < 70 ? "你正在接近关键事实，继续追问。" : progress < 100 ? "真相近在眼前，只差最后一块拼图。" : "真相已被完整还原。"}</p>
            </div>

            <div className="interrogation">
              <div className="chat-log">
                {messages.map((message, index) => (
                  <div key={index} className={`message ${message.from}`}>
                    <span className="avatar">{message.from === "judge" ? "AI" : "你"}</span>
                    <div>
                      <small>{message.from === "judge" ? "真相裁判" : "侦探提问"}</small>
                      <p className={message.answer ? `verdict verdict-${message.answer}` : ""}>{message.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} aria-hidden="true" />
              </div>
              <form className="question-form" onSubmit={ask}>
                <label htmlFor="question">提出一个可以判断的问题</label>
                <div>
                  <input id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例如：司机认识那些“乘客”吗？" />
                  <button type="submit" disabled={isJudging}>{isJudging ? "AI 推理中…" : <>发送提问 <span>↗</span></>}</button>
                </div>
                <small>AI 裁判只会回答：<b>是</b> / <b>不是</b> / <b>无关</b></small>
              </form>
            </div>

            <div className="reveal-actions">
              <button onClick={() => openClue("hint")}><span>♧</span><div><small>思路卡住了？</small><strong>获得提示</strong></div></button>
              <i />
              <button className="truth-button" onClick={() => openClue("truth")}><span>◉</span><div><small>想知道完整答案？</small><strong>直接揭晓汤底</strong></div></button>
            </div>
          </section>
        </div>
      ) : (
        <section className="create-page">
          <div className="create-intro">
            <span className="eyebrow">THE STORY FORGE · 故事工坊</span>
            <h1>把一粒灵感，<br />熬成一碗<em>好汤</em>。</h1>
            <p>可以是一段完整故事，也可以只有一句突发奇想。AI 会替你提炼反转、隐藏因果，生成适合朋友聚会的海龟汤。</p>
            <ol>
              <li><b>01</b><span><strong>写下故事</strong><small>完整故事或一两句灵感都可以</small></span></li>
              <li><b>02</b><span><strong>AI 炼制汤面</strong><small>自动匹配标题与题材分类</small></span></li>
              <li><b>03</b><span><strong>修改并分享</strong><small>满意后可收入公共题库</small></span></li>
            </ol>
            <div className="quote">“最好的谜题，答案揭晓时总让人说：原来如此。”</div>
          </div>

          <div className="forge-card">
            {!generated ? (
              <>
                <div className="forge-header">
                  <span>灵感原稿</span><i>STEP 01 / 03</i>
                </div>
                <label htmlFor="story">你的故事或灵感</label>
                <textarea id="story" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={"例如：一个女孩每天都会给去世的妈妈打电话，某一天电话突然接通了……\n\n不用担心写得不完整，把想到的先告诉我们。"} />
                <div className="textarea-foot"><span>{draft.length} 字</span><span>建议 10—500 字</span></div>
                <button className="generate-button" onClick={generateSoup} disabled={isGenerating}>
                  <span>✦</span> {isGenerating ? "AI 正在提炼悬念…" : "AI 炼制汤面"} <i>约 5—15 秒</i>
                </button>
                <div className="privacy-note">仅用于生成谜题，不会公开你的原稿</div>
              </>
            ) : (
              <>
                <div className="forge-header">
                  <span>新汤出炉</span><i>STEP 02 / 03</i>
                </div>
                <div className="generated-tag">✦ AI 已完成标题与分类匹配</div>
                <div className="field-row">
                  <label>谜题标题<input value={generatedTitle} onChange={(e) => setGeneratedTitle(e.target.value)} /></label>
                  <label>题材分类<select value={generatedCategory} onChange={(e) => setGeneratedCategory(e.target.value)}><option>亲情</option><option>爱情</option><option>友情</option><option>灵异</option><option>恐怖</option><option>悬疑</option><option>其他</option></select></label>
                </div>
                <label htmlFor="surface">汤面内容</label>
                <textarea id="surface" className="result-area" value={generatedSurface} onChange={(e) => setGeneratedSurface(e.target.value)} />
                <div className="publish-choice">
                  <button className={publicAllowed ? "checked" : ""} onClick={() => setPublicAllowed(!publicAllowed)} role="checkbox" aria-checked={publicAllowed}><i>{publicAllowed ? "✓" : ""}</i><span><strong>允许收录进系统公开题库</strong><small>其他玩家将可以发现并推理这碗汤</small></span></button>
                </div>
                <div className="result-actions">
                  <button className="secondary" onClick={generateSoup} disabled={isGenerating}>{isGenerating ? "正在生成新版本…" : "↻ 再次生成"}</button>
                  <button className="primary" onClick={publish}>完成并{publicAllowed ? "公开" : "保存"} <span>↗</span></button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <footer><span>谜雾汤馆 · 每一个问题，都离真相更近一点</span><span>无需登录 · 打开即玩 · 聚会必备</span></footer>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="关闭">×</button>
            {modal === "hint" && <>
              <span className="modal-icon">♧</span><small>侦探提示 · HINT</small><h3>换一个角度想想</h3><p>{isLoadingClue ? "正在翻阅案卷…" : modalContent}</p>
              <button onClick={() => setModal(null)}>带着线索继续推理</button>
            </>}
            {modal === "truth" && <>
              <span className="modal-icon">◉</span><small>完整汤底 · THE TRUTH</small><h3>{selected.title}</h3><p>{isLoadingClue ? "正在解封案卷…" : modalContent}</p>
              <button onClick={() => { setProgress(100); setModal(null); }}>我知道真相了</button>
            </>}
            {modal === "badge" && <>
              <div className="badge-medal"><span>100%</span></div><small>完美还原 · ACHIEVEMENT</small><h3>迷雾终结者</h3><p>你没有直接查看汤底，完整还原了「{selected.title}」的真相。</p>
              <div className="badge-actions">
                <button onClick={() => openClue("truth")}>查看完整汤底</button>
                <button onClick={() => { setModal(null); setToast("战绩卡已准备好，可以分享给朋友"); }}>分享我的战绩</button>
              </div>
            </>}
          </div>
        </div>
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
