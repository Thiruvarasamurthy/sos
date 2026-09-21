const schemes = [
  { id: "pmkisan", title: "PM-KISAN", tag: "Central scheme", summary: "Income support information for eligible landholding farmer families.", audience: "Eligible landholding farmer families", docs: ["Identity details", "Bank account information", "Landholding records"], source: "PM-KISAN official portal", url: "https://pmkisan.gov.in/" },
  { id: "pmfby", title: "PMFBY", tag: "Crop insurance", summary: "Guidance on crop insurance rules, eligibility and enrolment.", audience: "Farmers covered under notified crops and applicable conditions", docs: ["Identity details", "Land or cultivation records", "Bank account information"], source: "PMFBY official portal", url: "https://pmfby.gov.in/" },
  { id: "kcc", title: "Kisan Credit Card", tag: "Credit support", summary: "Guidance on agricultural credit access, documents and the appropriate lender.", audience: "Eligible farmers and agricultural borrowers", docs: ["Identity or address proof", "Land or cultivation documents", "Lender documents"], source: "Official banking and government guidance", url: "#" },
  { id: "pacs", title: "PACS Services", tag: "Cooperative", summary: "Explore common services offered through Primary Agricultural Credit Societies.", audience: "PACS members and cooperative users", docs: ["Membership details where applicable", "Relevant service documents"], source: "Ministry of Cooperation", url: "https://www.cooperation.gov.in/" }
];

const services = [
  ["🏦", "PACS services", "Understand common cooperative services and what to ask your local PACS."],
  ["📄", "Document help", "Build a checklist before visiting a cooperative or service centre."],
  ["⚖️", "Governance guidance", "Get plain-language explanations of cooperative processes."],
  ["📍", "Where to go", "See the suggested official channel for an issue or service."]
];

const state = {
  screen: "home",
  language: "English",
  region: "Tamil Nadu",
  query: "",
  saved: JSON.parse(localStorage.getItem("sahaya_saved") || "[]"),
  draft: JSON.parse(localStorage.getItem("sahaya_draft") || "null")
};

const escapeHTML = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
const saveState = () => {
  localStorage.setItem("sahaya_saved", JSON.stringify(state.saved));
  localStorage.setItem("sahaya_draft", JSON.stringify(state.draft));
};

function navigate(screen) {
  state.screen = screen;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function navBar() {
  const items = [["home", "⌂", "Home"], ["explore", "▦", "Explore"], ["saved", "♡", "My Items"], ["profile", "○", "Profile"]];
  return `<nav class="bottom">${items.map(([id, icon, label]) => `<button class="nav ${state.screen === id ? "active" : ""}" onclick="navigate('${id}')">${icon}<br>${label}</button>`).join("")}</nav>`;
}

function layout(content) {
  return `<div class="shell"><header class="top"><div class="brand"><div class="logo">🌿</div><div><b>Sahaya CoopAI</b><span class="muted">Cooperative assistance & service navigation</span></div></div><span class="status">● Prototype · Local</span></header>${content}${navBar()}<div class="footer">Prototype guidance only · Verify current details on official sources</div></div>`;
}

function schemeCard(scheme) {
  const savedLabel = state.saved.includes(scheme.id) ? "Saved ✓" : "Save";
  return `<article class="card scheme"><div class="head"><span class="badge">✓ ${escapeHTML(scheme.tag)}</span><span class="muted">Official-source demo</span></div><h3>${escapeHTML(scheme.title)}</h3><p>${escapeHTML(scheme.summary)}</p><div class="muted">👥 ${escapeHTML(scheme.audience)}<br>↗ ${escapeHTML(scheme.source)}</div><div class="actions"><button class="btn primary" onclick="showDetails('${scheme.id}')">View details</button><button class="btn secondary" onclick="toggleSaved('${scheme.id}')">${savedLabel}</button></div></article>`;
}

function homePage() {
  const quick = [["🌾", "Find a scheme", "Benefits, eligibility and documents.", "explore"], ["🏢", "Cooperative services", "PACS services and where to go next.", "cooperative"], ["📝", "Raise a grievance", "Turn a problem into a structured draft.", "grievance"], ["◉", "Ask for help", "Describe your situation in your own words.", "assistant"]];
  return `<section class="hero"><small>◈ ${escapeHTML(state.region)} · ${escapeHTML(state.language)}</small><h1>Help that feels <span>human.</span></h1><p>Sahaya brings schemes, cooperative services, grievance preparation and guided support into one calm place — without making the citizen figure out the system first.</p><div class="search"><input id="homeQuestion" placeholder="Ask: How do I apply for crop insurance?"><button class="btn primary" onclick="askQuestion()">Ask for help</button></div><div class="scroll-cue">Scroll to explore ↓</div></section><section class="section"><div class="head"><div><h2>What can we do for you?</h2><span class="muted">Four paths, one starting point.</span></div></div><div class="grid four">${quick.map(([icon, title, text, action]) => `<button class="card quick" onclick="quickAction('${action}')"><div class="icon">${icon}</div><h3>${title}</h3><p>${text}</p></button>`).join("")}</div></section><section class="section grid two"><div class="card"><div class="head"><h2>Recommended</h2><span class="badge">Context-aware</span></div>${schemeCard(schemes[0])}</div><div class="card help-panel"><span class="badge">Need a person next?</span><h3>Start with your problem.</h3><p>You do not need to know the scheme name or department. Tell Sahaya what happened, then move to the relevant official route.</p><button class="btn primary" onclick="openAssistant()">Describe the problem</button></div></section>`;
}

function explorePage() {
  const query = state.query.toLowerCase();
  const matches = schemes.filter((scheme) => !query || [scheme.title, scheme.tag, scheme.summary].join(" ").toLowerCase().includes(query));
  return `<section class="section"><div class="head"><div><h2>Scheme Navigator</h2><span class="muted">Plain-language, source-oriented information.</span></div><button class="btn secondary" onclick="state.query='';render()">Clear</button></div><div class="search"><input id="exploreQuestion" value="${escapeHTML(state.query)}" placeholder="Search scheme or service"><button class="btn primary" onclick="searchSchemes()">Search</button></div><div class="grid two section">${matches.length ? matches.map(schemeCard).join("") : `<div class="card"><b>No matching scheme</b><p class="muted">Try another search term.</p></div>`}</div></section>`;
}

function cooperativePage() {
  return `<section class="section"><div class="head"><div><h2>Cooperative Services</h2><span class="muted">Guidance for PACS and cooperative users.</span></div><span class="badge">PACS focused</span></div><div class="grid two">${services.map(([icon, title, text]) => `<article class="card"><div class="icon">${icon}</div><h3>${title}</h3><p class="muted">${text}</p><div class="actions"><button class="btn secondary" onclick="showToast('Guidance opened')">Open guidance</button></div></article>`).join("")}</div><div class="card help-panel section"><span class="badge">Assisted route</span><h3>Need help with a cooperative issue?</h3><p>Start a guided request and keep the explanation in plain language before moving to an official service.</p><button class="btn primary" onclick="navigate('grievance')">Start assisted request</button></div></section>`;
}

function grievancePage() {
  const draft = state.draft || { category: "Scheme / service", title: "", description: "" };
  const categories = ["Scheme / service", "PACS / cooperative", "Document / application", "Other"];
  return `<section class="section"><div class="head"><div><h2>Raise a Grievance</h2><span class="muted">Prepare the message before submitting it through an official channel.</span></div><span class="badge">Draft only</span></div><div class="grid two"><div class="card"><label class="muted">Issue category</label><select id="grievanceCategory">${categories.map((category) => `<option ${draft.category === category ? "selected" : ""}>${category}</option>`).join("")}</select><br><br><label class="muted">Short title</label><input id="grievanceTitle" value="${escapeHTML(draft.title)}" placeholder="Application status is not updated"><br><br><label class="muted">Describe what happened</label><textarea id="grievanceDescription" placeholder="What happened, where, when, and what help do you need?">${escapeHTML(draft.description)}</textarea><div class="actions"><button class="btn primary" onclick="saveDraft()">Save draft</button><button class="btn secondary" onclick="previewDraft()">Review draft</button></div></div><div class="card"><span class="badge">Before submitting</span><h3>Make the issue easy to understand.</h3><ul class="list"><li>State the service or scheme involved.</li><li>Explain the problem in simple steps.</li><li>Keep supporting documents ready.</li><li>Check the responsible authority.</li></ul><div class="notice">This prototype prepares a draft only. A real grievance is submitted only through an approved official system.</div></div></div></section>`;
}

function savedPage() {
  const matches = schemes.filter((scheme) => state.saved.includes(scheme.id));
  const draftBlock = state.draft ? `<div class="card help-panel section"><span class="badge">Draft saved</span><h3>${escapeHTML(state.draft.title || "Untitled request")}</h3><p>${escapeHTML(state.draft.description || "No description yet")}</p><button class="btn secondary" onclick="navigate('grievance')">Open draft</button></div>` : "";
  return `<section class="section"><div class="head"><div><h2>My Items</h2><span class="muted">Saved schemes and your current draft.</span></div></div>${draftBlock}<div class="grid two section">${matches.length ? matches.map(schemeCard).join("") : `<div class="card"><b>No saved schemes yet.</b><p class="muted">Tap Save on a scheme to keep it here.</p></div>`}</div></section>`;
}

function profilePage() {
  const languages = ["English", "தமிழ்", "हिन्दी", "తెలుగు", "ಕನ್ನಡ"];
  const regions = ["Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Kerala"];
  return `<section class="section"><div class="head"><div><h2>Profile & Settings</h2><span class="muted">Context used by the prototype.</span></div></div><div class="grid two"><div class="card"><h3>Your context</h3><label class="muted">Preferred language</label><select onchange="state.language=this.value;render()">${languages.map((language) => `<option ${state.language === language ? "selected" : ""}>${language}</option>`).join("")}</select><br><br><label class="muted">State</label><select onchange="state.region=this.value;render()">${regions.map((region) => `<option ${state.region === region ? "selected" : ""}>${region}</option>`).join("")}</select></div><div class="card"><h3>About Sahaya CoopAI</h3><p class="muted">A prototype for multilingual cooperative assistance, scheme discovery, guided grievance preparation and human-readable support.</p><div class="notice">Production requires authoritative data synchronization, backend validation and approved integrations.</div></div></div></section>`;
}

function showDetails(id) {
  const scheme = schemes.find((item) => item.id === id);
  if (!scheme) return;
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div class="panel"><button class="close" onclick="this.closest('.modal').remove()">Close</button><span class="badge">✓ ${escapeHTML(scheme.tag)}</span><h2>${escapeHTML(scheme.title)}</h2><p class="muted">${escapeHTML(scheme.summary)}</p><h3>Who it is for</h3><p class="muted">${escapeHTML(scheme.audience)}</p><h3>What to keep ready</h3><ul class="list">${scheme.docs.map((doc) => `<li>${escapeHTML(doc)}</li>`).join("")}</ul><div class="notice">Source: <b>${escapeHTML(scheme.source)}</b><br>Verify current eligibility and procedure on the official source.</div><div class="actions"><button class="btn primary" onclick="toggleSaved('${scheme.id}');this.textContent='Saved ✓'">Save</button><a class="btn secondary" target="_blank" rel="noreferrer" href="${scheme.url}">Open official source</a></div></div>`;
  document.body.appendChild(modal);
}

function toggleSaved(id) {
  state.saved = state.saved.includes(id) ? state.saved.filter((savedId) => savedId !== id) : [...state.saved, id];
  saveState();
  render();
}

function saveDraft() {
  state.draft = { category: document.getElementById("grievanceCategory").value, title: document.getElementById("grievanceTitle").value.trim(), description: document.getElementById("grievanceDescription").value.trim() };
  saveState();
  showToast("Draft saved locally");
  render();
}

function previewDraft() {
  const title = document.getElementById("grievanceTitle").value.trim() || "Untitled request";
  const description = document.getElementById("grievanceDescription").value.trim() || "No description yet";
  const category = document.getElementById("grievanceCategory").value;
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div class="panel"><button class="close" onclick="this.closest('.modal').remove()">Close</button><span class="badge">Preview</span><h2>${escapeHTML(title)}</h2><p class="muted">${escapeHTML(category)}</p><div class="notice">${escapeHTML(description)}</div><div class="actions"><button class="btn primary" onclick="saveDraft();this.closest('.modal').remove()">Save draft</button></div></div>`;
  document.body.appendChild(modal);
}

function openAssistant() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div class="panel"><button class="close" onclick="this.closest('.modal').remove()">Close</button><span class="badge">Help desk</span><h2>Tell us what happened.</h2><p class="muted">You can describe the situation without knowing the scheme or department name.</p><textarea id="assistantQuestion" placeholder="Example: I applied for crop insurance but I cannot see the status."></textarea><div class="actions"><button class="btn primary" onclick="findHelp()">Find a route</button><button class="btn secondary" onclick="navigate('grievance');this.closest('.modal').remove()">Raise a grievance</button></div><div id="assistantAnswer"></div></div>`;
  document.body.appendChild(modal);
}

function findHelp() {
  const question = document.getElementById("assistantQuestion").value.toLowerCase();
  const answer = document.getElementById("assistantAnswer");
  if (question.includes("insurance") || question.includes("crop")) {
    answer.innerHTML = `<div class="card section"><span class="badge">Suggested route</span><h3>Crop insurance guidance</h3><p class="muted">Start with PMFBY details, then use the official route for current rules and status information.</p><div class="actions"><button class="btn primary" onclick="showDetails('pmfby')">View PMFBY</button><button class="btn secondary" onclick="navigate('grievance');this.closest('.modal').remove()">Prepare grievance</button></div></div>`;
  } else {
    answer.innerHTML = `<div class="notice section">Try naming the service, scheme, document, or problem. The prototype will suggest a relevant route.</div>`;
  }
}

function quickAction(action) {
  if (action === "explore") navigate("explore");
  else if (action === "cooperative") navigate("cooperative");
  else if (action === "grievance") navigate("grievance");
  else openAssistant();
}

function askQuestion() {
  const question = document.getElementById("homeQuestion").value.trim();
  if (!question) return showToast("Type a question first");
  state.query = question;
  navigate("explore");
}

function searchSchemes() {
  state.query = document.getElementById("exploreQuestion").value.trim();
  render();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#e7e2d5;color:#13150f;padding:11px 15px;border-radius:12px;font-size:12px;font-weight:800;z-index:100;box-shadow:0 12px 40px #0008";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function addTiltEffects() {
  document.querySelectorAll(".card, .hero").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      element.style.transform = `perspective(1100px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg) translateY(-2px)`;
    });
    element.addEventListener("pointerleave", () => { element.style.transform = ""; });
  });
}

function render() {
  let content = homePage();
  if (state.screen === "explore") content = explorePage();
  if (state.screen === "cooperative") content = cooperativePage();
  if (state.screen === "grievance") content = grievancePage();
  if (state.screen === "saved") content = savedPage();
  if (state.screen === "profile") content = profilePage();
  document.getElementById("app").innerHTML = layout(content);
  addTiltEffects();
}

render();