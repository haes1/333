// This static MVP keeps data in the current browser only. Do not use it for
// sensitive data until a server-side authentication and database are added.
const PASSWORD = "0910";
const GROUPS_KEY = "333-groups";
const PEOPLE_KEY = "333-people";

const $ = (selector) => document.querySelector(selector);
const read = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const validUrl = (value) => { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; } };

function showApp(loggedIn) {
  $("#loginView").hidden = loggedIn;
  $("#appView").hidden = !loggedIn;
  if (loggedIn) render();
}

function render() {
  const groups = read(GROUPS_KEY);
  const people = read(PEOPLE_KEY);
  $("#groupCount").textContent = groups.length;
  $("#personCount").textContent = people.length;
  $("#personGroup").innerHTML = '<option value="">Без группы</option>' + groups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name || group.url)}</option>`).join("");
  $("#groupsList").classList.toggle("empty-state", groups.length === 0);
  $("#groupsList").innerHTML = groups.length ? groups.map((group) => `<div class="list-item"><div class="item-main"><p class="item-title">${escapeHtml(group.name || "Без названия")}</p><a class="item-link" href="${escapeHtml(group.url)}" target="_blank" rel="noopener">${escapeHtml(group.url)}</a></div><button class="delete" data-delete-group="${escapeHtml(group.id)}" type="button">Удалить</button></div>`).join("") : "Пока нет добавленных групп.";
  renderPeople(people, groups);
}

function renderPeople(people, groups) {
  const query = $("#searchInput").value.trim().toLowerCase();
  const filtered = people.filter((person) => `${person.name} ${person.url}`.toLowerCase().includes(query));
  $("#peopleList").classList.toggle("empty-state", filtered.length === 0);
  $("#peopleList").innerHTML = filtered.length ? filtered.map((person) => {
    const group = groups.find((item) => item.id === person.groupId);
    return `<div class="record"><div class="record-info"><p class="item-title">${escapeHtml(person.name)}</p><a class="item-link" href="${escapeHtml(person.url)}" target="_blank" rel="noopener">${escapeHtml(person.url)}</a><div class="record-meta">${group ? `<span class="tag">${escapeHtml(group.name || group.url)}</span>` : ""}<span>${new Date(person.createdAt).toLocaleDateString("ru-RU")}</span></div></div><button class="delete" data-delete-person="${escapeHtml(person.id)}" type="button">Удалить</button></div>`;
  }).join("") : (query ? "Ничего не найдено." : "Пока нет записей.");
}

$("#loginForm").addEventListener("submit", (event) => { event.preventDefault(); const ok = $("#password").value === PASSWORD; $("#loginError").hidden = ok; if (ok) { sessionStorage.setItem("333-auth", "1"); showApp(true); } });
$("#logoutButton").addEventListener("click", () => { sessionStorage.removeItem("333-auth"); showApp(false); });
$("#groupForm").addEventListener("submit", (event) => { event.preventDefault(); const url = $("#groupUrl").value.trim(); if (!validUrl(url)) return; const groups = read(GROUPS_KEY); groups.unshift({ id: crypto.randomUUID(), url, name: $("#groupName").value.trim(), createdAt: Date.now() }); write(GROUPS_KEY, groups); event.target.reset(); render(); });
$("#personForm").addEventListener("submit", (event) => { event.preventDefault(); const url = $("#personUrl").value.trim(); if (!validUrl(url)) return; const people = read(PEOPLE_KEY); people.unshift({ id: crypto.randomUUID(), name: $("#personName").value.trim(), url, groupId: $("#personGroup").value, createdAt: Date.now() }); write(PEOPLE_KEY, people); event.target.reset(); render(); });
$("#searchInput").addEventListener("input", () => renderPeople(read(PEOPLE_KEY), read(GROUPS_KEY)));
document.addEventListener("click", (event) => { const groupId = event.target.dataset.deleteGroup; const personId = event.target.dataset.deletePerson; if (groupId) { write(GROUPS_KEY, read(GROUPS_KEY).filter((item) => item.id !== groupId)); render(); } if (personId) { write(PEOPLE_KEY, read(PEOPLE_KEY).filter((item) => item.id !== personId)); render(); } });
$("#exportButton").addEventListener("click", () => { const groups = read(GROUPS_KEY); const rows = [["name", "url", "group"], ...read(PEOPLE_KEY).map((person) => [person.name, person.url, groups.find((group) => group.id === person.groupId)?.name || ""])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "333-contacts.csv"; link.click(); URL.revokeObjectURL(link.href); });
$("#importButton").addEventListener("click", () => $("#csvInput").click());
$("#csvInput").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; const lines = (await file.text()).split(/\r?\n/).filter(Boolean); const rows = lines.slice(lines[0].toLowerCase().startsWith("name,") ? 1 : 0).map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))); const people = read(PEOPLE_KEY); rows.forEach(([name, url, group]) => { if (name && validUrl(url)) people.unshift({ id: crypto.randomUUID(), name, url, groupId: read(GROUPS_KEY).find((item) => item.name === group)?.id || "", createdAt: Date.now() }); }); write(PEOPLE_KEY, people); event.target.value = ""; render(); });

showApp(sessionStorage.getItem("333-auth") === "1");
