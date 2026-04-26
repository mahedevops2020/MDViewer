import { useState, useEffect, useRef, useCallback } from "react";

// ─── Default content ──────────────────────────────────────────────────────────
const DEMO = `# Welcome to MDView ✦

A **Markdown viewer PWA** — install it on your Android home screen and open local \`.md\` files.

---

## Features

  ✅ Syntax highlighted code blocks
  ✅ Scrollable tables
  ✅ Dark / Light theme
  ✅ Works offline
  ✅ Open local .md files
  ✅ Installable on Android

---

## Code Example

\`\`\`javascript
const greet = async (name) => {
  const res = await fetch(\`https://api.example.com/users/\${name}?verbose=true&format=json\`);
  const { greeting, metadata } = await res.json();
  console.log(greeting, metadata);
};
\`\`\`

\`\`\`bash
adb shell am start -n com.example.app/.MainActivity --es "key" "value" --ez "flag" true
\`\`\`

---

## Table

| Language | Stars | Use Case | Typed |
|---|---|---|---|
| Rust | ⭐⭐⭐⭐⭐ | Systems, WASM | Static |
| Go | ⭐⭐⭐⭐ | Backend, CLI | Static |
| Python | ⭐⭐⭐⭐⭐ | ML, Scripts | Dynamic |
| TypeScript | ⭐⭐⭐⭐ | Frontend | Static |

---

## Blockquote

> Drop any \`.md\` file using the **Open** button at the top, or share a file to this app from your file manager.

---

*Tap the ◈ icon on your home screen after installing.*
`;

// ─── Markdown Parser ──────────────────────────────────────────────────────────
function parseMarkdown(md) {
  let html = md;
  const blocks = [];

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const i = blocks.length;
    blocks.push({ lang: lang || "text", code: code.trimEnd() });
    return `%%BLK_${i}%%`;
  });

  html = html.replace(/`([^`]+)`/g, '<code class="ic">$1</code>');
  html = html.replace(/^###### (.+)$/gm, (_, t) => `<h6 id="${slug(t)}">${t}</h6>`);
  html = html.replace(/^##### (.+)$/gm,  (_, t) => `<h5 id="${slug(t)}">${t}</h5>`);
  html = html.replace(/^#### (.+)$/gm,   (_, t) => `<h4 id="${slug(t)}">${t}</h4>`);
  html = html.replace(/^### (.+)$/gm,    (_, t) => `<h3 id="${slug(t)}">${t}</h3>`);
  html = html.replace(/^## (.+)$/gm,     (_, t) => `<h2 id="${slug(t)}">${t}</h2>`);
  html = html.replace(/^# (.+)$/gm,      (_, t) => `<h1 id="${slug(t)}">${t}</h1>`);
  html = html.replace(/^---$/gm, "<hr/>");

  html = html.replace(/(^> .+(\n|$))+/gm, (b) => {
    const inner = b.replace(/^> ?/gm, "").trim();
    return `<blockquote>${inner}</blockquote>`;
  });

  html = html.replace(/((\|.+\|\n)+)/g, (table) => {
    const rows = table.trim().split("\n");
    if (rows.length < 2) return table;
    const th = rows[0].split("|").filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join("");
    const tb = rows.slice(2).map(row => {
      const cells = row.split("|").filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<div class="tbl-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
  });

  html = html.replace(/^- \[x\] (.+)$/gm, '<li class="ti done"><span class="cb">✓</span>$1</li>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<li class="ti"><span class="cb">○</span>$1</li>');
  html = html.replace(/(^- .+\n?)+/gm, b => {
    const items = b.trim().split("\n").map(l => l.match(/^  -/) ? `<li class="nest">${l.slice(4)}</li>` : `<li>${l.slice(2)}</li>`).join("");
    return `<ul>${items}</ul>`;
  });
  html = html.replace(/(^\d+\. .+\n?)+/gm, b => {
    const items = b.trim().split("\n").map(l => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `<ol>${items}</ol>`;
  });

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img"/>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  html = html.split(/\n{2,}/).map(b => {
    b = b.trim();
    if (!b) return "";
    if (/^<(h[1-6]|ul|ol|blockquote|hr|div|img|%%BLK)/.test(b)) return b;
    return `<p>${b.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  blocks.forEach(({ lang, code }, i) => {
    const hi = highlight(code, lang);
    html = html.replace(
      `%%BLK_${i}%%`,
      `<div class="cb-wrap" data-lang="${lang}">
        <div class="cb-head"><span class="lb">${lang}</span><button class="cp-btn" data-code="${encodeURIComponent(code)}">Copy</button></div>
        <pre><code>${hi}</code></pre>
      </div>`
    );
  });

  return html;
}

function slug(t) { return t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-"); }

function highlight(code, lang) {
  let h = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const kw = {
    javascript: /\b(const|let|var|function|return|async|await|if|else|for|while|class|import|export|default|new|this|typeof|throw|try|catch|of|in|from)\b/g,
    python:     /\b(def|return|import|from|if|else|elif|for|while|class|try|except|with|as|lambda|and|or|not|in|is|None|True|False|print|range)\b/g,
    bash:       /\b(echo|if|then|fi|for|do|done|while|export|cd|ls|rm|cp|mv|grep|docker|git|npm|adb|curl|wget)\b/g,
  };
  h = h.replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="s">$1$2$1</span>');
  h = h.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span class="cm">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="nm">$1</span>');
  if (kw[lang]) h = h.replace(kw[lang], '<span class="kw">$1</span>');
  return h;
}

function buildTOC(md) {
  const h = [], re = /^(#{1,4}) (.+)$/gm;
  let m;
  while ((m = re.exec(md))) h.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, ""), id: slug(m[2]) });
  return h;
}

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  dark:  { bg:"#0e1117", bar:"#141920", surf:"#161d27", edBg:"#0b0f15", bdr:"#1e2a3a", txt:"#cdd9e5", muted:"#5a7080", acc:"#4fa3e0", acc2:"#e06c4f", code:"#1a2535", codeBdr:"#1e2e42" },
  light: { bg:"#f5f7fa", bar:"#ffffff", surf:"#eef1f5", edBg:"#fafbfc", bdr:"#dde2ea", txt:"#1e2532", muted:"#8896aa", acc:"#1e6bcc", acc2:"#cc4a2a", code:"#eef2f7", codeBdr:"#d5dde8" },
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [md, setMd] = useState(DEMO);
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("preview"); // preview | edit
  const [toc, setTocOpen] = useState(false);
  const [fileName, setFileName] = useState("demo.md");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const previewRef = useRef(null);
  const fileRef = useRef(null);

  const t = dark ? T.dark : T.light;
  const html = parseMarkdown(md);
  const tocItems = buildTOC(md);

  // Capture install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Copy btn delegation
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const h = (e) => {
      const btn = e.target.closest(".cp-btn");
      if (!btn) return;
      navigator.clipboard.writeText(decodeURIComponent(btn.dataset.code)).then(() => {
        btn.textContent = "✓ Done";
        setTimeout(() => (btn.textContent = "Copy"), 1500);
      });
    };
    el.addEventListener("click", h);
    return () => el.removeEventListener("click", h);
  }, [tab]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const r = new FileReader();
    r.onload = (ev) => { setMd(ev.target.result); setTab("preview"); };
    r.readAsText(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    const r = new FileReader();
    r.onload = (ev) => { setMd(ev.target.result); setTab("preview"); };
    r.readAsText(file);
  }, []);

  const jumpTo = (id) => {
    previewRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth" });
    setTocOpen(false);
    setTab("preview");
  };

  const install = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", background:t.bg, color:t.txt, fontFamily:"'JetBrains Mono','Fira Code',monospace", overflow:"hidden" }}
      onDrop={handleDrop} onDragOver={e=>e.preventDefault()}>
      <style>{css(t)}</style>

      {/* ── Top bar ── */}
      <div style={{ background:t.bar, borderBottom:`1px solid ${t.bdr}`, padding:"0 12px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, paddingTop:"env(safe-area-inset-top)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:t.acc, fontWeight:700, fontSize:18, letterSpacing:1 }}>◈</span>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:t.acc }}>MDView</div>
            <div style={{ fontSize:10, color:t.muted, marginTop:-2 }}>{fileName}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {installPrompt && !installed && (
            <button onClick={install} style={{ ...btn(t), background:t.acc, color:"#fff", fontSize:11, padding:"5px 10px" }}>
              ↓ Install
            </button>
          )}
          <button onClick={() => setTocOpen(!toc)} style={iconBtn(t)}>≡</button>
          <button onClick={() => setDark(!dark)} style={iconBtn(t)}>{dark?"☀":"☾"}</button>
          <button onClick={() => fileRef.current.click()} style={{ ...iconBtn(t), color:t.acc, border:`1px solid ${t.acc}` }}>Open</button>
          <input ref={fileRef} type="file" accept=".md,.txt,.markdown" style={{display:"none"}} onChange={handleFile}/>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display:"flex", background:t.surf, borderBottom:`1px solid ${t.bdr}`, flexShrink:0 }}>
        {["preview","edit"].map(m => (
          <button key={m} onClick={()=>setTab(m)} style={{ flex:1, padding:"10px 0", border:"none", cursor:"pointer", background:"transparent", color: tab===m ? t.acc : t.muted, fontWeight: tab===m ? 700 : 400, fontSize:13, borderBottom: tab===m ? `2px solid ${t.acc}` : "2px solid transparent", fontFamily:"inherit", letterSpacing:0.5 }}>
            {m === "preview" ? "👁 Preview" : "✎ Edit"}
          </button>
        ))}
      </div>

      {/* ── TOC ── */}
      {toc && (
        <div style={{ position:"absolute", top:100, right:12, zIndex:200, background:t.surf, border:`1px solid ${t.bdr}`, borderRadius:12, padding:"8px 0", minWidth:220, maxHeight:"60vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ color:t.acc, fontWeight:700, fontSize:10, letterSpacing:2, padding:"4px 14px 8px" }}>TABLE OF CONTENTS</div>
          {tocItems.map((h,i)=>(
            <div key={i} onClick={()=>jumpTo(h.id)}
              style={{ padding:"7px 14px", paddingLeft:(h.level-1)*14+14, fontSize:13, color:t.muted, cursor:"pointer", borderLeft:`2px solid ${h.level===1?t.acc:"transparent"}` }}>
              {h.text}
            </div>
          ))}
          {tocItems.length === 0 && <div style={{ padding:"8px 14px", color:t.muted, fontSize:12 }}>No headings found</div>}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
        {/* Preview */}
        <div ref={previewRef} className="mdp"
          style={{ display: tab==="preview"?"block":"none", height:"100%", overflowY:"auto", padding:"20px 18px 40px", WebkitOverflowScrolling:"touch" }}
          dangerouslySetInnerHTML={{ __html: html }}/>

        {/* Editor */}
        {tab==="edit" && (
          <textarea value={md} onChange={e=>setMd(e.target.value)}
            style={{ width:"100%", height:"100%", border:"none", outline:"none", resize:"none", background:t.edBg, color:t.txt, fontFamily:"inherit", fontSize:13, lineHeight:1.7, padding:"16px", WebkitOverflowScrolling:"touch", caretColor:t.acc }}
            spellCheck={false}/>
        )}
      </div>

      {/* ── Bottom safe area ── */}
      <div style={{ height:"env(safe-area-inset-bottom)", background:t.bar, flexShrink:0 }}/>
    </div>
  );
}

const btn = (t) => ({ border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit" });
const iconBtn = (t) => ({ ...btn(t), background:"transparent", border:`1px solid ${t.bdr}`, color:t.muted, padding:"6px 10px", fontSize:13 });

// ─── CSS ──────────────────────────────────────────────────────────────────────
function css(t) { return `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:${t.bdr};border-radius:4px;}

.mdp{font-family:'Lora',Georgia,serif;font-size:15px;color:${t.txt};}
.mdp h1{font-size:1.8em;font-weight:600;margin:.2em 0 .5em;color:${t.acc};border-bottom:2px solid ${t.bdr};padding-bottom:.3em;line-height:1.3;}
.mdp h2{font-size:1.35em;font-weight:600;margin:1.4em 0 .4em;color:${t.txt};border-bottom:1px solid ${t.bdr};padding-bottom:.2em;}
.mdp h3{font-size:1.1em;font-weight:600;margin:1.1em 0 .3em;color:${t.txt};}
.mdp h4,.mdp h5,.mdp h6{font-size:1em;font-weight:600;margin:.9em 0 .2em;color:${t.muted};}
.mdp p{margin:.65em 0;line-height:1.75;}
.mdp a{color:${t.acc};text-decoration:none;border-bottom:1px solid ${t.acc}44;}
.mdp a:active{opacity:.7;}
.mdp hr{border:none;border-top:1px solid ${t.bdr};margin:1.5em 0;}
.mdp strong{color:${t.txt};font-weight:700;}
.mdp em{font-style:italic;}
.mdp del{color:${t.muted};}

.mdp blockquote{border-left:3px solid ${t.acc};background:${t.code};padding:10px 14px;margin:1em 0;border-radius:0 8px 8px 0;color:${t.muted};font-style:italic;font-size:.95em;}

.mdp ul,.mdp ol{padding-left:1.5em;margin:.5em 0;}
.mdp li{margin:.25em 0;line-height:1.65;}
.mdp li.nest{color:${t.muted};}
.mdp .ti{list-style:none;margin-left:-.3em;display:flex;align-items:flex-start;gap:8px;}
.mdp .cb{font-size:12px;color:${t.muted};margin-top:3px;flex-shrink:0;}
.mdp .ti.done{color:${t.muted};text-decoration:line-through;}
.mdp .ti.done .cb{color:${t.acc};}

.mdp .ic{background:${t.code};color:${t.acc2};padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:.83em;}

.mdp .cb-wrap{margin:1em 0;border-radius:10px;overflow:hidden;border:1px solid ${t.codeBdr};}
.mdp .cb-head{display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:${t.codeBdr};}
.mdp .lb{font-family:'JetBrains Mono',monospace;font-size:10px;color:${t.muted};text-transform:uppercase;letter-spacing:1px;}
.mdp .cp-btn{font-size:11px;font-family:'JetBrains Mono',monospace;background:${t.acc}22;border:1px solid ${t.acc}44;color:${t.acc};padding:3px 10px;border-radius:5px;cursor:pointer;}
.mdp pre{background:${t.code};overflow-x:auto;padding:14px;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.6;-webkit-overflow-scrolling:touch;}
.mdp code{font-family:inherit;}
.mdp .kw{color:#c792ea;font-weight:500;}
.mdp .s{color:#c3e88d;}
.mdp .cm{color:${t.muted};font-style:italic;}
.mdp .nm{color:#f78c6c;}

.mdp .tbl-wrap{overflow-x:auto;margin:1em 0;border-radius:8px;border:1px solid ${t.bdr};-webkit-overflow-scrolling:touch;}
.mdp table{border-collapse:collapse;width:100%;min-width:max-content;font-size:13px;font-family:'JetBrains Mono',monospace;}
.mdp th{background:${t.surf};color:${t.acc};padding:9px 14px;text-align:left;font-weight:700;font-size:11px;letter-spacing:.5px;border-bottom:2px solid ${t.bdr};white-space:nowrap;}
.mdp td{padding:8px 14px;border-bottom:1px solid ${t.bdr};white-space:nowrap;}
.mdp tr:last-child td{border-bottom:none;}

.mdp img.md-img{max-width:100%;border-radius:8px;margin:.75em 0;display:block;border:1px solid ${t.bdr};}
`; }
