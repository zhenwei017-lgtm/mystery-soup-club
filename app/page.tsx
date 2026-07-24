"use client";

import { FormEvent, useMemo, useState } from "react";

type Soup = {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  time: string;
  surface: string;
  truth: string;
  hint: string;
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
    truth: "我每天都坐这趟末班车，知道司机的妻女多年前在这条线路的事故中去世。司机一直把乘客当作家人。今天车上明明只有我，他却说“所有人”，说明他准备开车去当年的事故地点，与妻女一起结束生命。我报警救下了他。",
    hint: "司机口中的“所有人”，并不全是车上的乘客。",
    accent: "#b94e45",
  },
  {
    id: 2,
    title: "第二只杯子",
    category: "爱情",
    difficulty: "入门",
    time: "约 8 分钟",
    surface: "独居的女人每天回家，都会在桌上摆两只杯子。某天她只摆了一只，却笑着哭了。",
    truth: "她一直在等待失踪的恋人归来，为他保留一只杯子。那天警方确认恋人获救，正在医院等她，所以她不再需要在家中为他摆杯子。她喜极而泣。",
    hint: "少一只杯子，不代表少了一个人。",
    accent: "#997141",
  },
  {
    id: 3,
    title: "空白的全家福",
    category: "亲情",
    difficulty: "烧脑",
    time: "约 20 分钟",
    surface: "父亲去世后，女儿在他的抽屉里发现一张没有人的全家福。她看完后原谅了父亲。",
    truth: "照片使用的是父亲年轻时的相机，但胶卷从未曝光。父亲患有面孔失认症，不敢为家人拍照，害怕暴露自己认不出亲人的事实。那张“空白全家福”背后写满了家人的特征和回忆。",
    hint: "照片的价值，未必在正面。",
    accent: "#587570",
  },
  {
    id: 4,
    title: "没有影子的朋友",
    category: "友情",
    difficulty: "进阶",
    time: "约 12 分钟",
    surface: "男孩每天放学都和一个没有影子的朋友聊天。毕业那天，朋友第一次有了影子。",
    truth: "男孩的朋友是一位长期住院、只能通过学校走廊投影屏远程上课的同学，画面没有真实影子。毕业那天，他康复后第一次亲自来到学校。",
    hint: "他们一直在“见面”，却不在同一个空间。",
    accent: "#64726a",
  },
];

const categories = ["全部", "爱情", "亲情", "友情", "灵异", "恐怖"];

function answerQuestion(question: string) {
  const q = question.replace(/[？?！!，,。.]/g, "");
  const yes = ["司机", "报警", "死人", "妻", "女儿", "事故", "自杀", "家人", "过去", "认识", "救"];
  const no = ["鬼", "谋杀", "乘客杀", "车祸正在", "我是凶手", "绑架"];
  if (yes.some((word) => q.includes(word))) return "是";
  if (no.some((word) => q.includes(word))) return "不是";
  return "无关";
}

export default function Home() {
  const [mode, setMode] = useState<"play" | "create">("play");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [selected, setSelected] = useState(soups[0]);
  const [favorites, setFavorites] = useState<number[]>([2]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { from: "judge", text: "案卷已开启。请提出只能用“是 / 不是 / 无关”回答的问题。", answer: "" },
  ]);
  const [progress, setProgress] = useState(0);
  const [modal, setModal] = useState<"hint" | "truth" | "badge" | null>(null);
  const [draft, setDraft] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState("雨停之后");
  const [generatedCategory, setGeneratedCategory] = useState("亲情");
  const [generatedSurface, setGeneratedSurface] = useState("");
  const [publicAllowed, setPublicAllowed] = useState(true);
  const [toast, setToast] = useState("");

  const filtered = useMemo(
    () => soups.filter((s) => activeCategory === "全部" || s.category === activeCategory),
    [activeCategory],
  );

  function chooseSoup(soup: Soup) {
    setSelected(soup);
    setMessages([{ from: "judge", text: "案卷已开启。请开始你的推理。", answer: "" }]);
    setProgress(0);
    setModal(null);
  }

  function ask(e: FormEvent) {
    e.preventDefault();
    const clean = question.trim();
    if (!clean) return;
    const answer = answerQuestion(clean);
    const gain = answer === "是" ? 16 : answer === "不是" ? 7 : 0;
    const nextProgress = Math.min(100, progress + gain);
    setMessages((old) => [...old, { from: "user", text: clean, answer: "" }, { from: "judge", text: answer, answer }]);
    setQuestion("");
    setProgress(nextProgress);
    if (nextProgress === 100) setTimeout(() => setModal("badge"), 400);
  }

  function toggleFavorite(id: number) {
    setFavorites((old) => (old.includes(id) ? old.filter((item) => item !== id) : [...old, id]));
  }

  function generateSoup() {
    if (!draft.trim()) {
      setToast("先写下一点故事或灵感");
      setTimeout(() => setToast(""), 2200);
      return;
    }
    const short = draft.trim().slice(0, 64);
    setGeneratedSurface(`每逢雨夜，${short}。直到雨停的那一天，所有人却都松了一口气。为什么？`);
    setGeneratedTitle(draft.includes("朋友") ? "未寄出的合照" : draft.includes("电话") ? "最后一通电话" : "雨停之后");
    setGeneratedCategory(draft.includes("朋友") ? "友情" : draft.includes("爱") ? "爱情" : "亲情");
    setGenerated(true);
  }

  function publish() {
    setToast(publicAllowed ? "已收录进公开汤库，等待下一位侦探" : "已保存这份专属汤面");
    setTimeout(() => setToast(""), 2600);
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
          <button className="icon-button" aria-label="查看收藏" title="收藏"><span>♡</span><b>{favorites.length}</b></button>
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
              <div><span className="status-dot" /> 案卷调查中 <i>CASE 0{selected.id}</i></div>
              <button onClick={() => toggleFavorite(selected.id)} aria-label="收藏此谜题" className={favorites.includes(selected.id) ? "favorited" : ""}>
                {favorites.includes(selected.id) ? "♥ 已收藏" : "♡ 收藏"}
              </button>
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
              </div>
              <form className="question-form" onSubmit={ask}>
                <label htmlFor="question">提出一个可以判断的问题</label>
                <div>
                  <input id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例如：司机认识那些“乘客”吗？" />
                  <button type="submit">发送提问 <span>↗</span></button>
                </div>
                <small>AI 裁判只会回答：<b>是</b> / <b>不是</b> / <b>无关</b></small>
              </form>
            </div>

            <div className="reveal-actions">
              <button onClick={() => setModal("hint")}><span>♧</span><div><small>思路卡住了？</small><strong>获得提示</strong></div></button>
              <i />
              <button className="truth-button" onClick={() => setModal("truth")}><span>◉</span><div><small>想知道完整答案？</small><strong>直接揭晓汤底</strong></div></button>
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
                <button className="generate-button" onClick={generateSoup}><span>✦</span> AI 炼制汤面 <i>约 5 秒</i></button>
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
                  <label>题材分类<select value={generatedCategory} onChange={(e) => setGeneratedCategory(e.target.value)}><option>亲情</option><option>爱情</option><option>友情</option><option>灵异</option><option>恐怖</option></select></label>
                </div>
                <label htmlFor="surface">汤面内容</label>
                <textarea id="surface" className="result-area" value={generatedSurface} onChange={(e) => setGeneratedSurface(e.target.value)} />
                <div className="publish-choice">
                  <button className={publicAllowed ? "checked" : ""} onClick={() => setPublicAllowed(!publicAllowed)} role="checkbox" aria-checked={publicAllowed}><i>{publicAllowed ? "✓" : ""}</i><span><strong>允许收录进系统公开题库</strong><small>其他玩家将可以发现并推理这碗汤</small></span></button>
                </div>
                <div className="result-actions">
                  <button className="secondary" onClick={generateSoup}>↻ 再次生成</button>
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
              <span className="modal-icon">♧</span><small>侦探提示 · HINT</small><h3>换一个角度想想</h3><p>{selected.hint}</p>
              <button onClick={() => setModal(null)}>带着线索继续推理</button>
            </>}
            {modal === "truth" && <>
              <span className="modal-icon">◉</span><small>完整汤底 · THE TRUTH</small><h3>{selected.title}</h3><p>{selected.truth}</p>
              <button onClick={() => { setProgress(100); setModal(null); }}>我知道真相了</button>
            </>}
            {modal === "badge" && <>
              <div className="badge-medal"><span>100%</span></div><small>完美还原 · ACHIEVEMENT</small><h3>迷雾终结者</h3><p>你没有直接查看汤底，完整还原了「{selected.title}」的真相。</p>
              <button onClick={() => { setModal(null); setToast("战绩卡已准备好，可以分享给朋友"); }}>分享我的战绩</button>
            </>}
          </div>
        </div>
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
