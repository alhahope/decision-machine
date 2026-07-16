"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "wheel" | "quick" | "tournament";
type Phase = "idle" | "running" | "result";

const runTimings = {
  wheel: 5200,
  quick: 3600,
  tournamentMinimum: 4600,
  tournamentStep: 1300,
} as const;

type Choice = {
  id: string;
  text: string;
  weight: number;
  color: string;
};

type HistoryItem = {
  id: string;
  result: string;
  mode: Mode;
  reaction: "accepted" | "rejected";
  createdAt: number;
};

const palette = ["#ffcf39", "#3764e8", "#ff684b", "#1fa47b", "#f48fb1", "#7e6bd8", "#49a6c8", "#e9912d"];

const defaultChoices: Choice[] = [
  { id: "hotpot", text: "去吃火锅", weight: 3, color: palette[0] },
  { id: "sushi", text: "吃寿司", weight: 2, color: palette[1] },
  { id: "burger", text: "汉堡薯条", weight: 2, color: palette[2] },
  { id: "cook", text: "自己做饭", weight: 1, color: palette[3] },
];

const templates = [
  { name: "今天吃什么", items: ["火锅", "寿司", "烧烤", "家常菜", "汉堡", "自己做"] },
  { name: "周末去哪", items: ["去公园", "逛展览", "看电影", "郊外走走", "宅在家"] },
  { name: "现在做什么", items: ["先工作 25 分钟", "出去散步", "收拾房间", "读几页书", "什么都不做"] },
] as const;

const modeLabels: Record<Mode, { title: string; short: string; description: string }> = {
  wheel: { title: "加权轮盘", short: "WHEEL", description: "权重越高，被选中的概率越大" },
  quick: { title: "快速抽选", short: "QUICK", description: "不给大脑反悔的时间" },
  tournament: { title: "淘汰赛", short: "BRACKET", description: "两两对决，直到冠军出现" },
};

function makeChoice(text: string, index: number): Choice {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    text,
    weight: 1,
    color: palette[index % palette.length],
  };
}

function secureRandom() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] / 4_294_967_296;
  }
  return Math.random();
}

function weightedPick(choices: Choice[]) {
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let cursor = secureRandom() * total;
  for (const choice of choices) {
    cursor -= choice.weight;
    if (cursor <= 0) return choice;
  }
  return choices[choices.length - 1];
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(secureRandom() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function buildTournament(choices: Choice[]) {
  let competitors = shuffle(choices);
  const rounds: string[][] = [competitors.map((choice) => choice.text)];
  while (competitors.length > 1) {
    const winners: Choice[] = [];
    for (let index = 0; index < competitors.length; index += 2) {
      const left = competitors[index];
      const right = competitors[index + 1];
      winners.push(!right || secureRandom() < 0.5 ? left : right);
    }
    competitors = winners;
    rounds.push(winners.map((choice) => choice.text));
  }
  return { winner: competitors[0], rounds };
}

function playSequence(enabled: boolean, notes: number[]) {
  if (!enabled) return;
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.045, context.currentTime + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.09 + 0.11);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + index * 0.09);
    oscillator.stop(context.currentTime + index * 0.09 + 0.12);
  });
  window.setTimeout(() => void context.close(), 1000);
}

function drawWheel(canvas: HTMLCanvasElement, choices: Choice[]) {
  const size = 620;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  const center = size / 2;
  const radius = 282;
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let angle = 0;
  ctx.clearRect(0, 0, size, size);
  choices.forEach((choice) => {
    const sweep = (choice.weight / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = choice.color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#171c2b";
    ctx.stroke();

    const middle = angle + sweep / 2;
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(middle);
    ctx.translate(radius * 0.61, 0);
    if (middle > Math.PI / 2 && middle < Math.PI * 1.5) ctx.rotate(Math.PI);
    ctx.fillStyle = choice.color === "#ffcf39" ? "#171c2b" : "#fffaf0";
    ctx.font = '800 24px "PingFang SC", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = choice.text.length > 8 ? `${choice.text.slice(0, 8)}…` : choice.text;
    ctx.fillText(label, 0, 0);
    ctx.font = "800 16px ui-monospace, monospace";
    ctx.fillText(`×${choice.weight}`, 0, 28);
    ctx.restore();
    angle += sweep;
  });
  ctx.beginPath();
  ctx.arc(center, center, 56, 0, Math.PI * 2);
  ctx.fillStyle = "#fffaf0";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#171c2b";
  ctx.stroke();
  ctx.fillStyle = "#171c2b";
  ctx.font = "900 18px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PICK", center, center - 9);
  ctx.fillText("ONE", center, center + 12);
}

function winnerCenterAngle(choices: Choice[], winner: Choice) {
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let cursor = 0;
  for (const choice of choices) {
    const sweep = (choice.weight / total) * 360;
    if (choice.id === winner.id) return cursor + sweep / 2;
    cursor += sweep;
  }
  return 0;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const runIdRef = useRef(0);
  const [choices, setChoices] = useState<Choice[]>(defaultChoices);
  const [newChoice, setNewChoice] = useState("");
  const [mode, setMode] = useState<Mode>("wheel");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Choice | null>(null);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [rounds, setRounds] = useState<string[][]>([]);
  const [tournamentRoundCount, setTournamentRoundCount] = useState(0);
  const [reaction, setReaction] = useState<"none" | "accepted" | "rejected">("none");
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  const activeChoices = useMemo(
    () => choices.filter((choice) => !excludedIds.includes(choice.id)),
    [choices, excludedIds],
  );
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const savedChoices = window.localStorage.getItem("pick-one-choices");
        const savedHistory = window.localStorage.getItem("pick-one-history");
        if (savedChoices) setChoices(JSON.parse(savedChoices));
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        setSoundOn(window.localStorage.getItem("pick-one-sound") !== "off");
      } catch {
        // Local storage is optional.
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem("pick-one-choices", JSON.stringify(choices));
      window.localStorage.setItem("pick-one-history", JSON.stringify(history));
      window.localStorage.setItem("pick-one-sound", soundOn ? "on" : "off");
    } catch {
      // Local storage is optional.
    }
  }, [choices, history, soundOn, loaded]);

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, activeChoices);
  }, [activeChoices]);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const clearScheduled = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const later = (callback: () => void, delay: number, runId: number) => {
    const timer = window.setTimeout(() => {
      if (runIdRef.current === runId) callback();
      timersRef.current = timersRef.current.filter((item) => item !== timer);
    }, delay);
    timersRef.current.push(timer);
  };

  const resetResult = () => {
    runIdRef.current += 1;
    clearScheduled();
    setPhase("idle");
    setResult(null);
    setReaction("none");
    setRounds([]);
    setTournamentRoundCount(0);
    setShareStatus("");
  };

  const updateChoice = (id: string, patch: Partial<Choice>) => {
    setChoices((current) => current.map((choice) => choice.id === id ? { ...choice, ...patch } : choice));
    resetResult();
  };

  const addChoice = () => {
    const text = newChoice.trim();
    if (!text || choices.length >= 8) return;
    setChoices((current) => [...current, makeChoice(text, current.length)]);
    setNewChoice("");
    resetResult();
  };

  const removeChoice = (id: string) => {
    if (choices.length <= 2) return;
    setChoices((current) => current.filter((choice) => choice.id !== id));
    setExcludedIds((current) => current.filter((item) => item !== id));
    resetResult();
  };

  const applyTemplate = (items: readonly string[]) => {
    setChoices(items.map((item, index) => makeChoice(item, index)));
    setExcludedIds([]);
    resetResult();
  };

  const reveal = (winner: Choice, delay: number, runId: number) => {
    later(() => {
      setResult(winner);
      setPhase("result");
      playSequence(soundOn, [440, 554, 659, 880]);
    }, delay, runId);
  };

  const decide = () => {
    if (activeChoices.length < 2 || phase === "running") return;
    clearScheduled();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setReaction("none");
    setResult(null);
    setShareStatus("");
    setRounds([]);
    setTournamentRoundCount(0);
    setPhase("running");
    playSequence(soundOn, [220, 260, 300]);

    if (mode === "tournament") {
      const tournament = buildTournament(activeChoices);
      setTournamentRoundCount(tournament.rounds.length);
      setRounds(tournament.rounds.slice(0, 1));
      tournament.rounds.slice(1).forEach((_, index) => {
        later(() => setRounds(tournament.rounds.slice(0, index + 2)), (index + 1) * runTimings.tournamentStep, runId);
      });
      const bracketDuration = Math.max(
        runTimings.tournamentMinimum,
        (tournament.rounds.length - 1) * runTimings.tournamentStep + 1100,
      );
      reveal(tournament.winner, bracketDuration, runId);
      return;
    }

    const winner = mode === "wheel" ? weightedPick(activeChoices) : activeChoices[Math.floor(secureRandom() * activeChoices.length)];
    if (mode === "wheel") {
      const center = winnerCenterAngle(activeChoices, winner);
      const base = rotationRef.current + 1440;
      const correction = (360 - ((base + center) % 360)) % 360;
      const nextRotation = base + correction;
      rotationRef.current = nextRotation;
      setRotation(nextRotation);
      reveal(winner, runTimings.wheel, runId);
    } else {
      reveal(winner, runTimings.quick, runId);
    }
  };

  const recordReaction = (nextReaction: "accepted" | "rejected") => {
    if (!result) return;
    setReaction(nextReaction);
    const item: HistoryItem = {
      id: `${Date.now()}-${result.id}`,
      result: result.text,
      mode,
      reaction: nextReaction,
      createdAt: Date.now(),
    };
    setHistory((current) => [item, ...current].slice(0, 8));
    if (nextReaction === "accepted") playSequence(soundOn, [523, 659, 784, 1046]);
    else playSequence(soundOn, [260, 220]);
  };

  const excludeAndRetry = () => {
    if (!result || activeChoices.length <= 2) return;
    setExcludedIds((current) => [...current, result.id]);
    resetResult();
  };

  const share = async () => {
    if (!result) return;
    const text = `选择困难决策机替我决定了：${result.text}\n${window.location.href}`;
    const canShare = typeof navigator.share === "function";
    try {
      if (canShare) await navigator.share({ title: "PICK ONE · 选择困难决策机", text, url: window.location.href });
      else await navigator.clipboard.writeText(text);
      setShareStatus(canShare ? "分享面板已打开" : "结果已复制");
    } catch {
      setShareStatus("已取消分享");
    }
  };

  return (
    <main className="page-shell">
      <div className="grid-background" aria-hidden="true" />
      <header className="topbar">
        <a href="#machine" className="brand"><span>P/O</span><b>PICK ONE</b><small>选择困难决策机</small></a>
        <p><i /> RANDOM ENGINE READY</p>
        <button type="button" onClick={() => setSoundOn((current) => !current)} aria-pressed={soundOn}>SFX {soundOn ? "ON" : "OFF"}</button>
      </header>

      <section className="hero">
        <div><span className="eyebrow">DECISION LAB / EXPERIMENT 03</span><h1>把纠结<br />交给<em>概率</em></h1></div>
        <p>输入你正在犹豫的选项，选择一种决策方式，然后按下启动键。结果不一定比你聪明，但它一定比你更果断。</p>
      </section>

      <section className="machine" id="machine" aria-label="选择困难决策机">
        <div className="machine-header">
          <span>DECISION REACTOR / ONLINE</span>
          <div className="mode-tabs" role="tablist" aria-label="决策模式">
            {(Object.keys(modeLabels) as Mode[]).map((item, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={mode === item}
                className={mode === item ? "active" : ""}
                onClick={() => { setMode(item); resetResult(); }}
                key={item}
              ><small>0{index + 1}</small>{modeLabels[item].title}</button>
            ))}
          </div>
          <span>{String(choices.length).padStart(2, "0")} OPTIONS</span>
        </div>

        <div className="machine-grid">
          <aside className="options-panel">
            <header><div><span>INPUT / 选项输入</span><h2>候选项</h2></div><b>{choices.length}/8</b></header>
            <div className="choice-list">
              {choices.map((choice, index) => (
                <div className={`choice-row ${excludedIds.includes(choice.id) ? "excluded" : ""}`} key={choice.id}>
                  <span className="choice-index" style={{ background: choice.color }}>{String(index + 1).padStart(2, "0")}</span>
                  <input
                    value={choice.text}
                    maxLength={18}
                    aria-label={`选项 ${index + 1}`}
                    onChange={(event) => updateChoice(choice.id, { text: event.target.value })}
                  />
                  <div className="weight-control" aria-label={`${choice.text}的权重`}>
                    <button type="button" onClick={() => updateChoice(choice.id, { weight: Math.max(1, choice.weight - 1) })} aria-label={`降低${choice.text}的权重`}>−</button>
                    <b>{choice.weight}</b>
                    <button type="button" onClick={() => updateChoice(choice.id, { weight: Math.min(5, choice.weight + 1) })} aria-label={`提高${choice.text}的权重`}>+</button>
                  </div>
                  <button type="button" className="remove-choice" disabled={choices.length <= 2} onClick={() => removeChoice(choice.id)} aria-label={`删除${choice.text}`}>×</button>
                </div>
              ))}
            </div>
            <div className="add-choice">
              <input
                value={newChoice}
                onChange={(event) => setNewChoice(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") addChoice(); }}
                placeholder="添加一个选项…"
                maxLength={18}
                aria-label="新选项"
              />
              <button type="button" onClick={addChoice} disabled={!newChoice.trim() || choices.length >= 8}>ADD</button>
            </div>
            <p className="weight-note">当前总权重 {totalWeight} · 加权仅作用于轮盘模式</p>
            <div className="templates"><span>快速模板</span>{templates.map((template) => <button type="button" key={template.name} onClick={() => applyTemplate(template.items)}>{template.name}</button>)}</div>
          </aside>

          <section className={`decision-stage mode-${mode} phase-${phase}`} aria-busy={phase === "running"}>
            <div className="stage-meta"><span>{modeLabels[mode].short} MODE</span><span>{modeLabels[mode].description}</span></div>

            {mode === "wheel" && (
              <div className="wheel-wrap">
                <div className="wheel-pointer" aria-hidden="true" />
                <canvas
                  ref={canvasRef}
                  className="wheel-canvas"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  aria-label={`加权轮盘，包含：${activeChoices.map((choice) => choice.text).join("、")}`}
                />
              </div>
            )}

            {mode === "quick" && (
              <div className="slot-machine" aria-hidden="true">
                {[0, 1, 2].map((column) => (
                  <div className="slot-column" key={column}>
                    <div>{[...activeChoices, ...activeChoices].map((choice, index) => <span key={`${column}-${choice.id}-${index}`} style={{ color: choice.color }}>{choice.text}</span>)}</div>
                  </div>
                ))}
                <div className="slot-line" />
              </div>
            )}

            {mode === "tournament" && (
              <div className="bracket-stage">
                <div className="versus-mark">VS</div>
                {rounds.length > 0 ? (
                  <div className="bracket-rounds">
                    {rounds.map((round, roundIndex) => (
                      <div key={roundIndex}><small>{roundIndex === 0 ? "START" : roundIndex === tournamentRoundCount - 1 ? "FINAL" : `ROUND ${roundIndex}`}</small>{round.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
                    ))}
                  </div>
                ) : (
                  <div className="bracket-preview">{choices.slice(0, 6).map((choice, index) => <span key={choice.id}>{choice.text}<i>{index % 2 ? "◀" : "▶"}</i></span>)}</div>
                )}
              </div>
            )}

            {phase === "running" && (
              <div className="process-line" role="status" aria-live="polite">
                <span className="visually-hidden">决策进行中，结果将在过程结束后揭晓</span>
              </div>
            )}

            {phase === "result" && result && (
              <div className={`result-card reaction-${reaction}`} role="status" aria-live="polite">
                <small>THE MACHINE HAS DECIDED</small>
                <h2>{result.text}</h2>
                {reaction === "none" && (
                  <>
                    <p>先别分析。看到这个结果的第一秒，你是什么感觉？</p>
                    <div className="reaction-buttons">
                      <button type="button" className="accept" onClick={() => recordReaction("accepted")}>好，就它了 <span>→</span></button>
                      <button type="button" onClick={() => recordReaction("rejected")}>等等，有点失望</button>
                    </div>
                  </>
                )}
                {reaction === "accepted" && (
                  <div className="reaction-message"><b>决定完成。</b><p>现在停止比较，去执行第一步。</p><div><button type="button" onClick={share}>分享结果</button><button type="button" onClick={resetResult}>开始新决定</button></div></div>
                )}
                {reaction === "rejected" && (
                  <div className="reaction-message insight"><b>好消息：你其实已经有答案了。</b><p>失望说明这个选项触碰了你的真实偏好。机器没有替你决定，但帮你把偏好照了出来。</p><div>{activeChoices.length > 2 && <button type="button" onClick={excludeAndRetry}>排除它，再来一次</button>}<button type="button" onClick={resetResult}>我自己选</button></div></div>
                )}
                <span className="share-status">{shareStatus}</span>
              </div>
            )}

            <button className="launch-button" type="button" onClick={decide} disabled={activeChoices.length < 2 || phase === "running"}>
              <span>{phase === "running" ? "决策进行中" : phase === "result" ? "再决定一次" : "启动决策"}</span><i>↗</i>
            </button>
          </section>

          <aside className="history-panel">
            <header><span>LOG / 实验记录</span><button type="button" onClick={() => setHistory([])} disabled={!history.length}>CLEAR</button></header>
            <div className="confidence-card"><small>本次有效选项</small><strong>{activeChoices.length}</strong><span>排除 {excludedIds.length} 项</span></div>
            {history.length ? (
              <ol>{history.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{item.result}</b><small>{modeLabels[item.mode].short} · {item.reaction === "accepted" ? "已接受" : "不满意"}</small></div><time>{new Date(item.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></li>)}</ol>
            ) : <div className="empty-history"><span>∅</span><p>暂无决策记录。<br />启动机器，让它替你背一次锅。</p></div>}
            <blockquote>“硬币落下的那一刻，你往往已经知道自己希望它是哪一面。”</blockquote>
          </aside>
        </div>
      </section>

      <section className="principles">
        <span className="eyebrow">HOW IT WORKS / 决策说明</span>
        <div><article><small>01</small><h2>概率负责打破僵局</h2><p>适合选项差异不大、继续比较的成本已经超过收益时。</p></article><article><small>02</small><h2>反应负责揭示偏好</h2><p>看到结果后的放松或失望，常常比分析表格更诚实。</p></article><article><small>03</small><h2>你负责承担选择</h2><p>重要的医疗、法律或财务决定，不应该交给随机数。</p></article></div>
      </section>

      <footer><div>PICK ONE <span>●</span></div><p>机器提供答案，你保留反悔的权利。</p><small>NO COOKIES · LOCAL DATA ONLY · {new Date().getFullYear()}</small></footer>
    </main>
  );
}
