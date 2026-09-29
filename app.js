const $ = (s) => document.querySelector(s);
let entries = [];

// ============================================================
// UNLOCK BUTTON — Fixed Version (guaranteed working)
// ============================================================
async function doUnlock() {
  const pwdInput = document.getElementById("masterPwd");
  const msgEl = document.getElementById("lockMsg");
  if (!pwdInput) return;

  const pwd = pwdInput.value;
  if (!pwd) {
    if (msgEl) msgEl.textContent = "Please enter master password";
    return;
  }

  try {
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();

    if (data.ok) {
      document.getElementById("lockScreen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      if (typeof loadEntries === "function") loadEntries();
    } else {
      if (msgEl) msgEl.textContent = data.error || "Wrong master password";
    }
  } catch (err) {
    if (msgEl) msgEl.textContent = "Server error: " + err.message;
  }
}

function bindUnlockButton() {
  const btn = document.getElementById("unlockBtn");
  const input = document.getElementById("masterPwd");

  if (btn && !btn.dataset.bound) {
    btn.addEventListener("click", doUnlock);
    btn.dataset.bound = "1";
  }
  if (input && !input.dataset.boundEnter) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doUnlock();
    });
    input.dataset.boundEnter = "1";
  }
}

// Multiple bind attempts taake 100% kaam kare
document.addEventListener("DOMContentLoaded", bindUnlockButton);
window.addEventListener("load", bindUnlockButton);
setTimeout(bindUnlockButton, 100);
setTimeout(bindUnlockButton, 500);

// ============================================================
// GENERIC PASSWORD TOGGLE — kisi bhi password field ke liye
// ============================================================
window.togglePwdById = function (fieldId, icon) {
  const f = document.getElementById(fieldId);
  if (!f) return;
  if (f.type === "password") {
    f.type = "text";
    icon.textContent = "🙈";
    icon.style.opacity = "1";
  } else {
    f.type = "password";
    icon.textContent = "👁";
    icon.style.opacity = "0.55";
  }
};

// Lock screen wale eye icon ke liye bhi (agar ab tak nahi hai)
window.toggleMasterPassword = function (icon) {
  window.togglePwdById("masterPwd", icon);
};

// ---------- LOAD ----------
async function loadEntries() {
  const res = await fetch("/api/entries");
  const data = await res.json();
  if (!data.ok) { alert(data.error); return; }
  entries = data.entries;
  render();
}

function render() {
  const q = $("#search").value.toLowerCase();
  const filtered = entries.filter(e =>
    (e.title || "").toLowerCase().includes(q) ||
    (e.username || "").toLowerCase().includes(q) ||
    (e.url || "").toLowerCase().includes(q)
  );

  const box = $("#entries");
  if (!filtered.length) {
    box.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;padding:40px">
      No passwords yet. Click "+ Add Password" to begin.</p>`;
    return;
  }

  box.innerHTML = filtered.map(e => `
    <div class="entry">
      <h3>${esc(e.title) || "Untitled"}</h3>
      <div class="user">${esc(e.username)}</div>
      ${e.url ? `<div class="url"><a href="${esc(e.url)}" target="_blank">${esc(e.url)}</a></div>` : ""}
      <div class="pwd-line">
        <code data-pwd="${esc(e.password)}" data-visible="false">••••••••</code>
        <button onclick="toggleEntryPwd(this)">👁</button>
        <button onclick="copyPwd(this)">📋</button>
      </div>
      <div class="actions">
        <button onclick="editEntry('${e.id}')">✏ Edit</button>
        <button class="del" onclick="delEntry('${e.id}')">🗑 Delete</button>
      </div>
    </div>
  `).join("");
}

function esc(s) {
  return (s || "").replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

window.toggleEntryPwd = (btn) => {
  const code = btn.previousElementSibling;
  const visible = code.dataset.visible === "true";
  if (visible) {
    code.textContent = "••••••••";
    code.dataset.visible = "false";
  } else {
    code.textContent = code.dataset.pwd;
    code.dataset.visible = "true";
  }
};

window.copyPwd = (btn) => {
  const code = btn.previousElementSibling;
  navigator.clipboard.writeText(code.dataset.pwd);
  toast("Password copied!");
};

$("#search").addEventListener("input", render);

// ---------- ADD / EDIT MODAL ----------
const modal = $("#modal");
$("#addBtn").onclick = () => openModal();
$("#cancelBtn").onclick = () => modal.classList.add("hidden");

function openModal(entry = null) {
  $("#modalTitle").textContent = entry ? "Edit Password" : "Add Password";
  $("#entryId").value = entry?.id || "";
  $("#f_title").value = entry?.title || "";
  $("#f_username").value = entry?.username || "";
  $("#f_password").value = entry?.password || "";
  $("#f_url").value = entry?.url || "";
  $("#f_notes").value = entry?.notes || "";
  modal.classList.remove("hidden");
}

window.editEntry = (id) => {
  const e = entries.find(x => x.id === id);
  if (e) openModal(e);
};

window.delEntry = async (id) => {
  if (!confirm("Delete this password?")) return;
  await fetch(`/api/entries/${id}`, {method: "DELETE"});
  loadEntries();
};

$("#saveBtn").onclick = async () => {
  const id = $("#entryId").value;
  const payload = {
    title: $("#f_title").value.trim(),
    username: $("#f_username").value.trim(),
    password: $("#f_password").value,
    url: $("#f_url").value.trim(),
    notes: $("#f_notes").value.trim(),
  };
  if (!payload.title && !payload.username && !payload.password) {
    alert("Please fill at least Title or Username.");
    return;
  }
  const url = id ? `/api/entries/${id}` : "/api/entries";
  const method = id ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.ok) {
    modal.classList.add("hidden");
    loadEntries();
  } else alert(data.error);
};

$("#togglePwd").onclick = () => {
  const f = $("#f_password");
  f.type = f.type === "password" ? "text" : "password";
};

$("#genPwd").onclick = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}";
  let pwd = "";
  for (let i = 0; i < 18; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  $("#f_password").value = pwd;
  $("#f_password").type = "text";
};

// ---------- IMPORT / EXPORT ----------
$("#importBtn").onclick = () => $("#importInput").click();

$("#importInput").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/import", {method: "POST", body: fd});
  const data = await res.json();
  if (data.ok) {
    toast(`Imported ${data.added} entries!`);
    loadEntries();
  } else alert("Import failed: " + data.error);
  e.target.value = "";
};

$("#exportBtn").onclick = (e) => {
  e.stopPropagation();
  $("#exportMenu").classList.toggle("hidden");
};

document.addEventListener("click", () => $("#exportMenu").classList.add("hidden"));
$("#exportMenu").onclick = (e) => e.stopPropagation();

// ---------- TOAST ----------
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

window.toggleMasterPassword = function (icon) {
  const f = document.getElementById("masterPwd");
  if (!f) return;
  if (f.type === "password") {
    f.type = "text";
    icon.textContent = "🙈";
    icon.style.opacity = "1";
  } else {
    f.type = "password";
    icon.textContent = "👁";
    icon.style.opacity = "0.55";
  }
};

// ============================================================
// THEME TOGGLE (Dark / Light) — Fixed Version
// ============================================================
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    setThemeIcons("🌙");
  } else {
    document.body.classList.remove("dark");
    setThemeIcons("☀️");
  }
  localStorage.setItem("passmanager-theme", theme);
}

function setThemeIcons(icon) {
  const b1 = document.getElementById("themeToggleLock");
  const b2 = document.getElementById("themeToggleMain");
  if (b1) b1.textContent = icon;
  if (b2) b2.textContent = icon;
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
}

// Page load par theme apply karein
(function () {
  const saved = localStorage.getItem("passmanager-theme") || "light";
  applyTheme(saved);
})();

// Buttons ko bind karein (multiple ways taake 100% kaam kare)
function bindThemeButtons() {
  const b1 = document.getElementById("themeToggleLock");
  const b2 = document.getElementById("themeToggleMain");
  if (b1 && !b1.dataset.bound) {
    b1.addEventListener("click", toggleTheme);
    b1.dataset.bound = "1";
  }
  if (b2 && !b2.dataset.bound) {
    b2.addEventListener("click", toggleTheme);
    b2.dataset.bound = "1";
  }
}

document.addEventListener("DOMContentLoaded", bindThemeButtons);
window.addEventListener("load", bindThemeButtons);
setTimeout(bindThemeButtons, 100);
setTimeout(bindThemeButtons, 500);


// Immediate binding bhi kar dein (agar DOM ready ho chuka hai)
setTimeout(() => {
  const b1 = document.getElementById("themeToggleLock");
  const b2 = document.getElementById("themeToggleMain");
  if (b1 && !b1.dataset.bound) {
    b1.addEventListener("click", toggleTheme);
    b1.dataset.bound = "1";
  }
  if (b2 && !b2.dataset.bound) {
    b2.addEventListener("click", toggleTheme);
    b2.dataset.bound = "1";
  }
}, 100);

// ============================================================
// FORGOT MASTER PASSWORD — Fixed Version
// ============================================================
const forgotLink = document.getElementById("forgotLink");
const forgotModal = document.getElementById("forgotModal");
const cancelForgot = document.getElementById("cancelForgot");
const resetVaultBtn = document.getElementById("resetVaultBtn");

if (forgotLink && forgotModal) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    forgotModal.classList.remove("hidden");
    const np = document.getElementById("newMasterPwd");
    const cp = document.getElementById("confirmMasterPwd");
    const cr = document.getElementById("confirmReset");
    const fm = document.getElementById("forgotMsg");
    if (np) np.value = "";
    if (cp) cp.value = "";
    if (cr) cr.checked = false;
    if (fm) fm.textContent = "";
  });
}

if (cancelForgot && forgotModal) {
  cancelForgot.addEventListener("click", () => {
    forgotModal.classList.add("hidden");
  });
}

if (resetVaultBtn) {
  resetVaultBtn.addEventListener("click", async () => {
    const newPwd = document.getElementById("newMasterPwd").value;
    const confirmPwd = document.getElementById("confirmMasterPwd").value;
    const confirmed = document.getElementById("confirmReset").checked;
    const msg = document.getElementById("forgotMsg");

    msg.textContent = "";

    if (!newPwd || newPwd.length < 4) {
      msg.textContent = "Password must be at least 4 characters.";
      return;
    }
    if (newPwd !== confirmPwd) {
      msg.textContent = "Passwords do not match.";
      return;
    }
    if (!confirmed) {
      msg.textContent = "Please check the confirmation box.";
      return;
    }

    if (!window.confirm(
      "⚠️ WARNING: Ye action aapka SARA purana data delete kar dega.\n\n" +
      "Kya aap waqai reset karna chahte hain?"
    )) return;

    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPwd })
      });
      const data = await res.json();

      if (data.ok) {
        forgotModal.classList.add("hidden");
        document.getElementById("lockScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        if (typeof loadEntries === "function") loadEntries();
        if (typeof toast === "function") {
          toast("Vault reset successful! Naya master password set ho gaya.");
        } else {
          alert("Vault reset successful! Naya master password set ho gaya.");
        }
      } else {
        msg.textContent = data.error || "Reset failed.";
      }
    } catch (err) {
      msg.textContent = "Server error: " + err.message;
    }
  });
}
// ============================================================
// 1. LOGIN (formerly unlock)
// ============================================================
async function doLogin() {
  const pwdInput = document.getElementById("masterPwd");
  const msgEl = document.getElementById("lockMsg");
  if (!pwdInput) return;

  const pwd = pwdInput.value;
  if (!pwd) {
    if (msgEl) msgEl.textContent = "Please enter your master password";
    return;
  }

  if (msgEl) msgEl.textContent = "";

  try {
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();

    if (data.ok) {
      document.getElementById("lockScreen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      if (typeof loadEntries === "function") loadEntries();
    } else {
      if (msgEl) msgEl.textContent = data.error || "Wrong master password";
    }
  } catch (err) {
    if (msgEl) msgEl.textContent = "Server error: " + err.message;
  }
}

function bindLoginButton() {
  const btn = document.getElementById("unlockBtn");
  const input = document.getElementById("masterPwd");

  if (btn && !btn.dataset.bound) {
    btn.addEventListener("click", doLogin);
    btn.dataset.bound = "1";
  }
  if (input && !input.dataset.boundEnter) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
    input.dataset.boundEnter = "1";
  }
}

// ============================================================
// 2. LOGOUT (formerly lock)
// ============================================================
async function doLogout() {
  try {
    await fetch("/api/lock", { method: "POST" });
  } catch (e) {}
  // Reload page — lock screen wapas aa jayegi
  location.reload();
}

function bindLogoutButton() {
  const btn = document.getElementById("logoutBtn");
  if (btn && !btn.dataset.bound) {
    btn.addEventListener("click", doLogout);
    btn.dataset.bound = "1";
  }
}

// ============================================================
// 3. PASSWORD SHOW/HIDE — Generic
// ============================================================
window.togglePwdById = function (fieldId, icon) {
  const f = document.getElementById(fieldId);
  if (!f) return;
  if (f.type === "password") {
    f.type = "text";
    icon.textContent = "🙈";
    icon.style.opacity = "1";
  } else {
    f.type = "password";
    icon.textContent = "👁";
    icon.style.opacity = "0.55";
  }
};

window.toggleMasterPassword = function (icon) {
  window.togglePwdById("masterPwd", icon);
};

// ============================================================
// 4. FORGOT PASSWORD → CHANGE PASSWORD (data safe)
// ============================================================
function bindForgotPassword() {
  const link = document.getElementById("forgotLink");
  const modal = document.getElementById("forgotModal");
  const cancel = document.getElementById("cancelForgot");
  const changeBtn = document.getElementById("changePwdBtn");

  if (link && modal && !link.dataset.bound) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      modal.classList.remove("hidden");
      // Clear fields
      ["oldMasterPwd", "newMasterPwd", "confirmMasterPwd", "forgotMsg"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (el.tagName === "INPUT") el.value = "";
          else el.textContent = "";
        }
      });
    });
    link.dataset.bound = "1";
  }

  if (cancel && modal && !cancel.dataset.bound) {
    cancel.addEventListener("click", () => modal.classList.add("hidden"));
    cancel.dataset.bound = "1";
  }

  if (changeBtn && !changeBtn.dataset.bound) {
    changeBtn.addEventListener("click", async () => {
      const oldPwd = document.getElementById("oldMasterPwd").value;
      const newPwd = document.getElementById("newMasterPwd").value;
      const confirmPwd = document.getElementById("confirmMasterPwd").value;
      const msg = document.getElementById("forgotMsg");

      msg.textContent = "";

      if (!oldPwd) {
        msg.textContent = "Please enter your old password";
        return;
      }
      if (newPwd.length < 4) {
        msg.textContent = "New password must be at least 4 characters";
        return;
      }
      if (newPwd !== confirmPwd) {
        msg.textContent = "Passwords do not match";
        return;
      }

      try {
        const res = await fetch("/api/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            old_password: oldPwd,
            new_password: newPwd
          })
        });
        const data = await res.json();

        if (data.ok) {
          modal.classList.add("hidden");
          // Auto login with new password
          document.getElementById("lockScreen").classList.add("hidden");
          document.getElementById("app").classList.remove("hidden");
          if (typeof loadEntries === "function") loadEntries();
          alert("✅ Password changed successfully! Your data is safe.");
        } else {
          msg.textContent = data.error || "Change failed";
        }
      } catch (err) {
        msg.textContent = "Server error: " + err.message;
      }
    });
    changeBtn.dataset.bound = "1";
  }
}

// ============================================================
// Bind everything (multiple attempts for reliability)
// ============================================================
function bindAll() {
  bindLoginButton();
  bindLogoutButton();
  bindForgotPassword();
}

document.addEventListener("DOMContentLoaded", bindAll);
window.addEventListener("load", bindAll);
setTimeout(bindAll, 100);
setTimeout(bindAll, 500);


// ============================================================
// CHANGE PASSWORD BUTTON — Working
// ============================================================
document.addEventListener("click", async function (e) {
  // Forgot link par click
  if (e.target && e.target.id === "forgotLink") {
    e.preventDefault();
    const modal = document.getElementById("forgotModal");
    if (modal) {
      modal.classList.remove("hidden");
      const n1 = document.getElementById("newMasterPwd");
      const n2 = document.getElementById("confirmMasterPwd");
      const cr = document.getElementById("confirmReset");
      const fm = document.getElementById("forgotMsg");
      if (n1) n1.value = "";
      if (n2) n2.value = "";
      if (cr) cr.checked = false;
      if (fm) fm.textContent = "";
    }
  }

  // Cancel button
  if (e.target && e.target.id === "cancelForgot") {
    e.preventDefault();
    const modal = document.getElementById("forgotModal");
    if (modal) modal.classList.add("hidden");
  }

  // Change Password button
  if (e.target && e.target.id === "changePwdBtn") {
    e.preventDefault();

    const newPwd = document.getElementById("newMasterPwd").value;
    const confirmPwd = document.getElementById("confirmMasterPwd").value;
    const confirmed = document.getElementById("confirmReset").checked;
    const msg = document.getElementById("forgotMsg");

    msg.textContent = "";

    if (!newPwd || newPwd.length < 4) {
      msg.textContent = "Password must be at least 4 characters";
      return;
    }
    if (newPwd !== confirmPwd) {
      msg.textContent = "Passwords do not match";
      return;
    }
    if (!confirmed) {
      msg.textContent = "Please check the confirmation box";
      return;
    }

    if (!window.confirm("⚠️ Purana data delete ho jayega. Reset karein?")) return;

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPwd })
      });
      const data = await res.json();

      if (data.ok) {
        document.getElementById("forgotModal").classList.add("hidden");
        document.getElementById("lockScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        if (typeof loadEntries === "function") loadEntries();
        alert("✅ Password change ho gaya!");
      } else {
        msg.textContent = data.error || "Change failed";
      }
    } catch (err) {
      msg.textContent = "Server error: " + err.message;
    }
  }
});