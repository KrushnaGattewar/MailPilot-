// popup.js — AI Email Manager v2.0
// All event listeners via addEventListener (CSP-compliant)

const OLLAMA_BASE = "http://127.0.0.1:11434";
const OLLAMA_URL  = OLLAMA_BASE + "/api/generate";

const PROMPT = `You are an AI Email Security and Coordination Assistant. Analyze the email and return ONLY a valid JSON object. No markdown, no explanation, no code fences, no extra text.

Classify intent as exactly one of: SCHEDULING_REQUEST, UPDATE_REQUEST, OTHER
Classify priority as exactly one of: URGENT, NORMAL, LOW
Set isSpam to true if the email shows phishing, scam, spam, or social engineering signs.
Set spamReason to a brief explanation if isSpam is true, else empty string.

Spam signals: urgency pressure, requests for passwords/OTP/bank details, suspicious links, too-good-to-be-true offers, impersonating banks/government/tech companies.

Extract participants (names/emails), proposed_times (normalized), constraints.
Generate a professional response_email with subject and body.

IMPORTANT: All string values must be in double quotes. All field names must be in double quotes. Return valid JSON only.

Return ONLY this JSON structure:
{
  "intent": "OTHER",
  "priority": "NORMAL",
  "isSpam": false,
  "spamReason": "",
  "participants": [],
  "proposed_times": [],
  "constraints": [],
  "missing_info": [],
  "summary": "",
  "response_email": {
    "subject": "",
    "body": ""
  }
}

End every response_email.body with this footer:
Best regards,
AI Email Manager

This email was sent by an experimental AI assistant. Please verify important details.`;

// ── State ─────────────────────────────────────────────────────────────────────
let allRecords    = [];
let currentFilter = "all";
let selectedRecord = null;
let ollamaOnline  = false;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  attachListeners();
  checkOllama();
  loadSettings();
  loadData();
});

// ── Attach All Listeners ──────────────────────────────────────────────────────
function attachListeners() {
  document.querySelectorAll(".tab").forEach(t =>
    t.addEventListener("click", () => switchTab(t.dataset.tab)));

  document.getElementById("ollamaStatus").addEventListener("click", checkOllama);
  document.getElementById("scanBtn").addEventListener("click", scanInbox);
  document.getElementById("scanOpenBtn").addEventListener("click", scanOpenEmail);
  document.getElementById("clearBtn").addEventListener("click", clearAllData);

  document.querySelectorAll(".filter-btn").forEach(b =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      currentFilter = b.dataset.filter;
      renderEmailList();
    }));

  document.getElementById("modelSelect").addEventListener("change", saveSettings);
  document.getElementById("maxStore").addEventListener("change", saveSettings);
  document.getElementById("clearDataBtn").addEventListener("click", clearAllData);
}

// ── Tab Switch ────────────────────────────────────────────────────────────────
function switchTab(tab) {
  ["dashboard","emails","reply","settings"].forEach(t => {
    document.querySelector('[data-tab="' + t + '"]').classList.toggle("active", t === tab);
    const pane = document.getElementById("pane-" + t);
    if (pane) pane.style.display = t === tab ? "block" : "none";
  });
  if (tab === "emails") renderEmailList();
}

// ── Ollama Status Check ───────────────────────────────────────────────────────
async function checkOllama() {
  const el   = document.getElementById("ollamaStatus");
  const text = document.getElementById("ollamaText");
  text.textContent = "Checking...";
  el.className = "pill off";

  try {
    const res = await fetch(OLLAMA_BASE + "/api/tags", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    ollamaOnline = true;
    el.className = "pill on";
    const n = data.models ? data.models.length : 0;
    text.textContent = "Online · " + n + " model" + (n !== 1 ? "s" : "");
    if (data.models && data.models.length) {
      const sel = document.getElementById("modelSelect");
      const existing = Array.from(sel.options).map(o => o.value);
      data.models.forEach(function(m) {
        const name = m.name.replace(":latest", "");
        if (!existing.includes(name) && !existing.includes(m.name)) {
          const opt = document.createElement("option");
          opt.value = m.name;
          opt.textContent = name;
          sel.appendChild(opt);
        }
      });
    }
  } catch(err) {
    ollamaOnline = false;
    el.className = "pill off";
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      text.textContent = "Cannot reach Ollama";
    } else if (err.message.includes("403")) {
      text.textContent = "CORS blocked";
    } else {
      text.textContent = "Offline";
    }
    console.warn("Ollama check failed:", err.message);
  }
}

// ── Load Settings ─────────────────────────────────────────────────────────────
function loadSettings() {
  chrome.storage.local.get("settings", function(d) {
    const s = d.settings || {};
    if (s.model)    document.getElementById("modelSelect").value = s.model;
    if (s.maxStore) document.getElementById("maxStore").value    = s.maxStore;
  });
}

function saveSettings() {
  chrome.storage.local.set({
    settings: {
      model:    document.getElementById("modelSelect").value,
      maxStore: parseInt(document.getElementById("maxStore").value)
    }
  });
}

// ── Load Stored Data ──────────────────────────────────────────────────────────
function loadData() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, function(res) {
    if (!res) return;
    allRecords = res.records || [];
    updateDashboard(res.stats || {});
  });
}

// ── Update Dashboard Stats ────────────────────────────────────────────────────
function updateDashboard(s) {
  setText("st-total",  s.total      || 0);
  setText("st-urgent", s.urgent     || 0);
  setText("st-spam",   s.spam       || 0);
  setText("st-sched",  s.scheduling || 0);
  setText("cb-urgent", s.urgent     || 0);
  setText("cb-normal", s.normal     || 0);
  setText("cb-low",    s.low        || 0);
  setText("cb-spam",   s.spam       || 0);
  setText("cb-sched",  s.scheduling || 0);
  setText("cb-update", s.update     || 0);
  if (s.lastScan) {
    var d = new Date(s.lastScan);
    setText("lastScan", "Last scan: " + d.toLocaleTimeString());
  }
}

// ── Clean & Parse LLM JSON ────────────────────────────────────────────────────
function cleanAndParseJSON(raw) {
  // Extract JSON block
  var match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON block found in response");

  var s = match[0];

  // Fix unquoted enum values: "intent": OTHER  =>  "intent": "OTHER"
  s = s.replace(/("(?:intent|priority)")\s*:\s*([A-Z_]+)(\s*[,}])/g, function(m, key, val, end) {
    return key + ': "' + val + '"' + end;
  });

  // Fix unquoted isSpam boolean strings
  s = s.replace(/"isSpam"\s*:\s*True/g, '"isSpam": true');
  s = s.replace(/"isSpam"\s*:\s*False/g, '"isSpam": false');

  // Fix trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, "$1");

  // Remove control characters except newlines/tabs
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");

  try {
    return JSON.parse(s);
  } catch(e) {
    console.warn("JSON parse failed after cleanup:", e.message, "\nCleaned string:", s.slice(0, 300));
    return null;
  }
}

// ── Analyze Email via Ollama ──────────────────────────────────────────────────
async function analyzeWithOllama(emailData) {
  const model = document.getElementById("modelSelect").value;
  const emailText = "From: " + emailData.sender + "\nSubject: " + emailData.subject + "\n\n" + (emailData.body || emailData.snippet || "");

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      prompt: PROMPT + "\n\nAnalyze this email:\n\n" + emailText,
      stream: false
    })
  });

  if (!res.ok) throw new Error("Ollama status " + res.status);
  const data = await res.json();
  const raw  = data.response || "";

  const parsed = cleanAndParseJSON(raw);

  if (parsed) return parsed;

  // Safe fallback
  return {
    intent: "OTHER",
    priority: "NORMAL",
    isSpam: false,
    spamReason: "",
    participants: [],
    proposed_times: [],
    constraints: [],
    missing_info: [],
    summary: "Analysis completed with limited parsing. Email was scanned successfully.",
    response_email: {
      subject: "Re: " + (emailData.subject || "Your Email"),
      body: "Thank you for your email. I will review it and get back to you shortly.\n\nBest regards,\nAI Email Manager\n\nThis email was sent by an experimental AI assistant. Please verify important details."
    }
  };
}

// ── Scan Inbox ────────────────────────────────────────────────────────────────
async function scanInbox() {
  if (!ollamaOnline) {
    showDashError("Ollama is offline. Run: set OLLAMA_ORIGINS=* && ollama serve");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes("mail.google.com")) {
    showDashError("Please open Gmail first.");
    return;
  }

  let emails = [];
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        var rows = document.querySelectorAll("tr.zA");
        var emails = [];
        rows.forEach(function(row, i) {
          if (i >= 20) return;
          try {
            var senderEl  = row.querySelector(".yX, .zF");
            var subjectEl = row.querySelector(".y6 span, .bog span");
            var snippetEl = row.querySelector(".y2");
            var timeEl    = row.querySelector(".xW span, .G3");
            var isUnread  = row.classList.contains("zE");
            var id        = row.getAttribute("id") || ("email_" + i + "_" + Date.now());
            emails.push({
              id:      id,
              sender:  senderEl  ? (senderEl.getAttribute("email") || senderEl.innerText.trim()) : "Unknown",
              subject: subjectEl ? subjectEl.innerText.trim() : "(No subject)",
              snippet: snippetEl ? snippetEl.innerText.trim().slice(0, 200) : "",
              time:    timeEl    ? (timeEl.getAttribute("title") || timeEl.innerText.trim()) : "",
              isUnread: isUnread
            });
          } catch(e) {}
        });
        return emails;
      }
    });
    emails = (results && results[0] && results[0].result) ? results[0].result : [];
  } catch(e) {
    showDashError("Could not read Gmail inbox: " + e.message);
    return;
  }

  if (!emails.length) {
    showDashError("No emails found. Make sure Gmail inbox is open.");
    return;
  }

  const pw    = document.getElementById("progressWrap");
  const fill  = document.getElementById("progressFill");
  const label = document.getElementById("progressLabel");
  const count = document.getElementById("progressCount");
  pw.style.display = "block";

  const btn = document.getElementById("scanBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Scanning...';
  showDashError("");

  let processed = 0;
  const newRecords = [];

  for (var i = 0; i < emails.length; i++) {
    var email = emails[i];
    label.textContent = "Analyzing: " + email.subject.slice(0, 30) + "...";
    count.textContent = processed + "/" + emails.length;
    fill.style.width  = (processed / emails.length * 100) + "%";

    try {
      const analysis = await analyzeWithOllama(email);
      const record = buildRecord(email, analysis);
      newRecords.push(record);

      // Inject badge into Gmail row
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: function(rid, pri, intent, isp) {
          var row = document.getElementById(rid) || document.querySelector('[id="' + rid + '"]');
          if (!row) return;
          var old = row.querySelector(".ai-email-badge");
          if (old) old.remove();
          var badge = document.createElement("span");
          badge.className = "ai-email-badge";
          var color = "#3b82f6";
          var lbl = intent;
          if (isp)              { color = "#ef4444"; lbl = "SPAM"; }
          else if (pri === "URGENT") { color = "#ef4444"; lbl = "URGENT"; }
          else if (pri === "NORMAL") { color = "#f59e0b"; lbl = "NORMAL"; }
          else if (pri === "LOW")    { color = "#10b981"; lbl = "LOW"; }
          badge.style.cssText = "display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;color:#fff;background:" + color + ";margin-left:6px;vertical-align:middle;";
          badge.textContent = lbl;
          var cell = row.querySelector(".y6, .bog");
          if (cell) cell.appendChild(badge);
        },
        args: [email.id, record.priority, record.intent, record.isSpam]
      }).catch(function() {});

    } catch(e) {
      console.warn("Failed to analyze:", email.subject, e);
    }
    processed++;
  }

  for (var j = 0; j < newRecords.length; j++) {
    await new Promise(function(resolve) {
      chrome.runtime.sendMessage({ type: "SAVE_RECORD", record: newRecords[j] }, resolve);
    });
  }

  loadData();
  allRecords = newRecords.concat(allRecords.filter(function(r) {
    return !newRecords.find(function(n) { return n.id === r.id; });
  }));

  pw.style.display = "none";
  fill.style.width  = "0%";
  btn.disabled = false;
  btn.textContent = "Scan Inbox";
  label.textContent = "Scanning emails...";
}

// ── Scan Currently Open Email ─────────────────────────────────────────────────
async function scanOpenEmail() {
  if (!ollamaOnline) {
    showDashError("Ollama is offline.");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes("mail.google.com")) {
    showDashError("Please open Gmail first.");
    return;
  }

  const btn = document.getElementById("scanOpenBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>';

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        try {
          var bodyEl =
            document.querySelector(".a3s.aiL") ||
            document.querySelector(".ii.gt .a3s") ||
            document.querySelector(".gs .a3s") ||
            document.querySelector(".adn .a3s");

          var subjectEl =
            document.querySelector("h2.hP") ||
            document.querySelector(".ha h2");

          var senderEl =
            document.querySelector(".gD") ||
            document.querySelector(".go .g2");

          var timeEl =
            document.querySelector(".g3") ||
            document.querySelector(".gH .g3");

          if (!bodyEl) return { error: "no_body" };

          return {
            id:      "open_" + Date.now(),
            sender:  senderEl ? (senderEl.getAttribute("email") || senderEl.innerText.trim()) : "Unknown",
            subject: subjectEl ? subjectEl.innerText.trim() : "(No subject)",
            body:    bodyEl.innerText.trim().slice(0, 2000),
            time:    timeEl ? (timeEl.getAttribute("title") || timeEl.innerText.trim()) : ""
          };
        } catch(e) {
          return { error: e.message };
        }
      }
    });

    const result = results && results[0] && results[0].result;

    if (!result || result.error === "no_body") {
      showDashError("Could not read email body. Make sure the email is fully open.");
      return;
    }
    if (result.error) {
      showDashError("Error reading email: " + result.error);
      return;
    }

    showDashError("");
    const analysis = await analyzeWithOllama(result);
    const record = buildRecord(result, analysis);

    await new Promise(function(resolve) {
      chrome.runtime.sendMessage({ type: "SAVE_RECORD", record: record }, resolve);
    });

    allRecords.unshift(record);
    loadData();
    selectedRecord = record;
    switchTab("reply");
    renderReply(record);

  } catch(e) {
    showDashError("Analysis failed: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Scan Open Email";
  }
}

// ── Build Record ──────────────────────────────────────────────────────────────
function buildRecord(email, analysis) {
  return {
    id:           email.id,
    sender:       email.sender,
    subject:      email.subject,
    time:         email.time || "",
    isUnread:     email.isUnread || false,
    intent:       analysis.intent      || "OTHER",
    priority:     analysis.priority    || "NORMAL",
    isSpam:       analysis.isSpam      || false,
    spamReason:   analysis.spamReason  || "",
    participants: analysis.participants  || [],
    proposed_times: analysis.proposed_times || [],
    constraints:  analysis.constraints  || [],
    missing_info: analysis.missing_info  || [],
    summary:      analysis.summary      || "",
    reply:        analysis.response_email || { subject: "", body: "" },
    scannedAt:    new Date().toISOString()
  };
}

// ── Render Email List ─────────────────────────────────────────────────────────
function renderEmailList() {
  const container = document.getElementById("emailList");
  let filtered = allRecords;

  if (currentFilter === "spam")        filtered = allRecords.filter(function(r) { return r.isSpam; });
  else if (currentFilter === "all")    filtered = allRecords;
  else if (["URGENT","NORMAL","LOW"].includes(currentFilter))
    filtered = allRecords.filter(function(r) { return r.priority === currentFilter && !r.isSpam; });
  else filtered = allRecords.filter(function(r) { return r.intent === currentFilter; });

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div>No emails here yet.<br/>Try <strong>Scan Inbox</strong> on Dashboard.</div></div>';
    return;
  }

  container.innerHTML = "";
  filtered.forEach(function(r) {
    const div = document.createElement("div");
    div.className = "email-item" + (selectedRecord && selectedRecord.id === r.id ? " selected" : "");
    div.innerHTML =
      '<div class="ei-top">' +
        '<div class="ei-sender">' + esc(r.sender) + '</div>' +
        '<div class="ei-time">' + esc(r.time || "") + '</div>' +
      '</div>' +
      '<div class="ei-subject">' + esc(r.subject) + '</div>' +
      '<div class="ei-tags">' +
        (r.isSpam
          ? '<span class="etag etag-spam">SPAM</span>'
          : '<span class="etag etag-' + (r.priority||"").toLowerCase() + '">' + priorityIcon(r.priority) + " " + (r.priority||"") + '</span>') +
        '<span class="etag ' + intentClass(r.intent) + '">' + intentLabel(r.intent) + '</span>' +
        (r.isUnread ? '<span class="etag etag-sched">NEW</span>' : '') +
      '</div>';
    div.addEventListener("click", function() {
      selectedRecord = r;
      switchTab("reply");
      renderReply(r);
    });
    container.appendChild(div);
  });
}

// ── Render Reply Panel ────────────────────────────────────────────────────────
function renderReply(r) {
  const wrap = document.getElementById("replyWrap");

  const ic = {
    SCHEDULING_REQUEST: { bg:"rgba(124,58,237,.15)", color:"#c4b5fd", border:"rgba(124,58,237,.3)" },
    UPDATE_REQUEST:     { bg:"rgba(59,130,246,.15)",  color:"#93c5fd", border:"rgba(59,130,246,.3)" },
    OTHER:              { bg:"rgba(100,116,139,.15)", color:"#94a3b8", border:"rgba(100,116,139,.3)" }
  }[r.intent] || { bg:"rgba(100,116,139,.15)", color:"#94a3b8", border:"rgba(100,116,139,.3)" };

  let html =
    '<div class="reply-header">' +
      '<div class="reply-title">Email Analysis</div>' +
      '<button class="back-btn" id="backBtn">Back</button>' +
    '</div>' +
    '<div class="reply-meta">' +
      '<div class="reply-meta-row"><span class="meta-label">From</span><span class="meta-val">' + esc(r.sender) + '</span></div>' +
      '<div class="reply-meta-row"><span class="meta-label">Subject</span><span class="meta-val">' + esc(r.subject) + '</span></div>' +
      (r.time ? '<div class="reply-meta-row"><span class="meta-label">Time</span><span class="meta-val">' + esc(r.time) + '</span></div>' : '') +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">' +
      '<div class="intent-badge" style="background:' + ic.bg + ';color:' + ic.color + ';border:1px solid ' + ic.border + ';">' + intentLabel(r.intent) + '</div>' +
      '<div class="intent-badge" style="background:' + priorityBg(r.priority) + ';color:' + priorityColor(r.priority) + ';border:1px solid ' + priorityBorder(r.priority) + ';">' + priorityIcon(r.priority) + " " + (r.priority||"NORMAL") + '</div>' +
    '</div>';

  if (r.isSpam) {
    html += '<div class="spam-warning">SPAM / Phishing Detected<br/>' + esc(r.spamReason || "This email shows signs of spam or phishing. Do not click links or provide personal information.") + '</div>';
  }

  if (r.summary) {
    html += '<div class="analysis-box"><div class="analysis-title">Summary</div><div style="font-size:11px;color:#cbd5e1;line-height:1.6;">' + esc(r.summary) + '</div></div>';
  }

  if ((r.participants && r.participants.length) || (r.proposed_times && r.proposed_times.length)) {
    html += '<div class="analysis-box"><div class="analysis-title">Details</div>';
    if (r.participants && r.participants.length)
      html += '<div class="analysis-row"><span class="analysis-key">People</span><span>' + esc(r.participants.join(", ")) + '</span></div>';
    if (r.proposed_times && r.proposed_times.length) {
      var times = r.proposed_times.map(function(t) { return typeof t === "object" ? Object.values(t).join(" · ") : t; });
      html += '<div class="analysis-row"><span class="analysis-key">Times</span><span>' + esc(times.join(" | ")) + '</span></div>';
    }
    if (r.constraints && r.constraints.length)
      html += '<div class="analysis-row"><span class="analysis-key">Notes</span><span>' + esc(r.constraints.join(", ")) + '</span></div>';
    html += '</div>';
  }

  if (r.reply && r.reply.body && !r.isSpam) {
    html +=
      '<div class="reply-card">' +
        '<div class="reply-card-hdr">' +
          '<span class="reply-card-title">Draft Reply</span>' +
          '<button class="copy-btn" id="copyReplyBtn">Copy</button>' +
        '</div>' +
        (r.reply.subject ? '<div class="subj-line">Subject: ' + esc(r.reply.subject) + '</div>' : '') +
        '<div class="reply-body">' + esc(r.reply.body) + '</div>' +
      '</div>';
  } else if (r.isSpam) {
    html += '<div class="analysis-box" style="text-align:center;color:#f87171;font-size:11px;">No reply drafted — flagged as spam/phishing.</div>';
  }

  wrap.innerHTML = html;

  document.getElementById("backBtn").addEventListener("click", function() { switchTab("emails"); });

  const copyBtn = document.getElementById("copyReplyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function() {
      const text = (r.reply.subject ? "Subject: " + r.reply.subject + "\n\n" : "") + r.reply.body;
      navigator.clipboard.writeText(text).then(function() {
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(function() { copyBtn.textContent = "Copy"; copyBtn.classList.remove("copied"); }, 2000);
      });
    });
  }
}

// ── Clear All ─────────────────────────────────────────────────────────────────
function clearAllData() {
  chrome.runtime.sendMessage({ type: "CLEAR_ALL" }, function() {
    allRecords = [];
    selectedRecord = null;
    updateDashboard({ total:0, urgent:0, normal:0, low:0, scheduling:0, update:0, spam:0, other:0 });
    setText("lastScan", "No scan yet");
    renderEmailList();
    document.getElementById("replyWrap").innerHTML =
      '<div class="empty-state"><div class="empty-icon">✉️</div><div>Select an email from the <strong>Emails</strong> tab to view its AI reply.</div></div>';
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showDashError(msg) {
  document.getElementById("dashError").innerHTML = msg ? '<div class="err-box">' + msg + '</div>' : "";
}
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}
function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function priorityIcon(p)   { return p === "URGENT" ? "🔴" : p === "NORMAL" ? "🟡" : "🟢"; }
function priorityBg(p)     { return p === "URGENT" ? "rgba(239,68,68,.15)" : p === "NORMAL" ? "rgba(245,158,11,.15)" : "rgba(16,185,129,.15)"; }
function priorityColor(p)  { return p === "URGENT" ? "#f87171" : p === "NORMAL" ? "#fcd34d" : "#6ee7b7"; }
function priorityBorder(p) { return p === "URGENT" ? "rgba(239,68,68,.3)" : p === "NORMAL" ? "rgba(245,158,11,.3)" : "rgba(16,185,129,.3)"; }
function intentClass(i)    { return i === "SCHEDULING_REQUEST" ? "etag-sched" : i === "UPDATE_REQUEST" ? "etag-update" : "etag-other"; }
function intentLabel(i)    { return i === "SCHEDULING_REQUEST" ? "📅 Scheduling" : i === "UPDATE_REQUEST" ? "📋 Update" : "💬 Other"; }
