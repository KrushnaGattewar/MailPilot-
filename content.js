// content.js — Injected into Gmail
// Reads inbox email list and active email content

(function () {
  // Scan inbox rows and return metadata (no body content for security)
  window.__emailManager_scanInbox = function () {
    const rows = document.querySelectorAll("tr.zA");
    const emails = [];
    rows.forEach((row, i) => {
      if (i >= 20) return; // Limit to 20 emails per scan
      try {
        const senderEl  = row.querySelector(".yX, .zF");
        const subjectEl = row.querySelector(".y6 span, .bog span");
        const snippetEl = row.querySelector(".y2");
        const timeEl    = row.querySelector(".xW span, .G3");
        const isUnread  = row.classList.contains("zE");
        const id        = row.getAttribute("id") || ("email_" + i + "_" + Date.now());

        emails.push({
          id:      id,
          sender:  senderEl  ? (senderEl.getAttribute("email") || senderEl.innerText.trim()) : "Unknown",
          subject: subjectEl ? subjectEl.innerText.trim() : "(No subject)",
          snippet: snippetEl ? snippetEl.innerText.trim().slice(0, 200) : "",
          time:    timeEl    ? timeEl.getAttribute("title") || timeEl.innerText.trim() : "",
          isUnread: isUnread
        });
      } catch (e) {}
    });
    return emails;
  };

  // Read the currently open email
  window.__emailManager_readOpen = function () {
    try {
      const bodyEl    = document.querySelector(".a3s.aiL") || document.querySelector(".ii.gt .a3s");
      const subjectEl = document.querySelector("h2.hP");
      const senderEl  = document.querySelector(".gD");
      const timeEl    = document.querySelector(".g3");

      if (!bodyEl) return null;

      return {
        id:      "open_" + Date.now(),
        sender:  senderEl  ? (senderEl.getAttribute("email") || senderEl.innerText.trim()) : "Unknown",
        subject: subjectEl ? subjectEl.innerText.trim() : "(No subject)",
        body:    bodyEl.innerText.trim().slice(0, 2000), // Limit body for processing
        time:    timeEl    ? timeEl.getAttribute("title") || timeEl.innerText.trim() : ""
      };
    } catch (e) {
      return null;
    }
  };

  // Inject classification badges into Gmail rows (visual overlay)
  window.__emailManager_injectBadge = function (rowId, priority, intent, isSpam) {
    try {
      const row = document.getElementById(rowId) || document.querySelector(`[id="${rowId}"]`);
      if (!row) return;
      // Remove existing badge
      const old = row.querySelector(".ai-email-badge");
      if (old) old.remove();

      const badge = document.createElement("span");
      badge.className = "ai-email-badge";

      let color = "#3b82f6", label = intent;
      if (isSpam)                          { color = "#ef4444"; label = "🚨 SPAM"; }
      else if (priority === "URGENT")      { color = "#ef4444"; label = "🔴 URGENT"; }
      else if (priority === "NORMAL")      { color = "#f59e0b"; label = "🟡 NORMAL"; }
      else if (priority === "LOW")         { color = "#10b981"; label = "🟢 LOW"; }
      if (intent === "SCHEDULING_REQUEST") { label += " · 📅"; }
      if (intent === "UPDATE_REQUEST")     { label += " · 📋"; }

      badge.style.cssText = `
        display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;
        font-weight:600;color:#fff;background:${color};margin-left:6px;
        vertical-align:middle;white-space:nowrap;font-family:sans-serif;
        opacity:0.92;
      `;
      badge.textContent = label;

      const subjectCell = row.querySelector(".y6, .bog");
      if (subjectCell) subjectCell.appendChild(badge);
    } catch (e) {}
  };
})();
