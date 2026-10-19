const pageContent = {
  dashboard: { title: "Dashboard", description: "A clear view of your community relationships.", action: "＋ Add contact", showStats: true, heading: "Quick links", detail: "Choose a section from the menu to get started." },
  contacts: { title: "Contacts", description: "Find people and keep their information organized.", action: "＋ Add contact", heading: "Contact workspace", detail: "Create, search, and review contact records." },
  memberships: { title: "Memberships", description: "Review membership status and renewals.", action: "＋ Add membership", heading: "Membership workspace", detail: "Membership records are a future extension." },
  donations: { title: "Donations", description: "Keep donation records organized.", action: "＋ Add donation", heading: "Donation workspace", detail: "Donation records are a future extension." },
  tasks: { title: "Tasks", description: "Track follow-ups and next steps.", action: "＋ Add task", heading: "Task workspace", detail: "Task tracking is a future extension." },
  reports: { title: "Reports", description: "Review summaries from your workspace.", action: "Run report", heading: "Reports workspace", detail: "Reports are a future extension." },
  settings: { title: "Settings", description: "Manage preferences for this workspace.", action: "Save settings", heading: "Workspace settings", detail: "Settings are a future extension." }
};
const navLinks = [...document.querySelectorAll("[data-page]")];
const sidebar = document.querySelector(".sidebar");
const mobileMenu = document.querySelector("#mobile-menu");
const pageTitle = document.querySelector("#page-title");
const pageDescription = document.querySelector("#page-description");
const breadcrumbPage = document.querySelector("#breadcrumb-page");
const quickAction = document.querySelector("#quick-action");
const panel = document.querySelector("#page-panel");
const stats = document.querySelector("#dashboard-stats");
const notice = document.querySelector("#notice");
const quickLinks = document.querySelector("#quick-links");
const contactsWorkspace = document.querySelector("#contacts-workspace");
const contactForm = document.querySelector("#contact-form");
const contactSearch = document.querySelector("#contact-search");
const contactRows = document.querySelector("#contact-rows");
const contactCount = document.querySelector("#contact-count");
const formMessage = document.querySelector("#form-message");
let currentPage = "dashboard";
let searchRequest = 0;

function safeCell(value) {
  const td = document.createElement("td");
  td.textContent = value || "—";
  return td;
}
function drawContacts(contacts) {
  contactRows.replaceChildren();
  contactCount.textContent = String(contacts.length);
  if (!contacts.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-row";
    cell.textContent = "No matching contacts. Try another search or add a contact.";
    row.append(cell);
    contactRows.append(row);
    return;
  }
  for (const contact of contacts) {
    const row = document.createElement("tr");
    row.append(safeCell(contact.name), safeCell(contact.organization), safeCell(contact.email), safeCell(contact.phone));
    contactRows.append(row);
  }
}
async function loadContacts(query = "") {
  const requestId = ++searchRequest;
  contactRows.innerHTML = '<tr><td class="empty-row" colspan="4">Loading contacts…</td></tr>';
  try {
    const response = await fetch("/api/contacts?q=" + encodeURIComponent(query));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load contacts.");
    if (requestId === searchRequest) drawContacts(data.contacts);
  } catch (error) {
    if (requestId === searchRequest) {
      contactRows.replaceChildren();
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4; cell.className = "empty-row"; cell.textContent = error.message;
      row.append(cell); contactRows.append(row);
    }
  }
}
function showPage(pageName) {
  const page = pageContent[pageName] || pageContent.dashboard;
  currentPage = pageContent[pageName] ? pageName : "dashboard";
  pageTitle.textContent = page.title;
  pageDescription.textContent = page.description;
  breadcrumbPage.textContent = page.title;
  quickAction.textContent = page.action;
  stats.hidden = !page.showStats;
  panel.querySelector("h2").textContent = page.heading;
  panel.querySelector(".panel-heading p").textContent = page.detail;
  quickLinks.hidden = currentPage !== "dashboard";
  contactsWorkspace.hidden = currentPage !== "contacts";
  navLinks.forEach(link => {
    const selected = link.dataset.page === currentPage;
    if (link.classList.contains("nav-link")) {
      link.classList.toggle("active", selected);
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  });
  notice.hidden = true;
  sidebar.classList.remove("open");
  mobileMenu.setAttribute("aria-expanded", "false");
  if (currentPage === "contacts") loadContacts(contactSearch.value);
}
navLinks.forEach(link => {
  link.addEventListener("click", event => {
    const pageName = link.dataset.page;
    if (!pageName) return;
    event.preventDefault();
    history.replaceState(null, "", "#" + pageName);
    showPage(pageName);
  });
});
mobileMenu.addEventListener("click", () => {
  const isOpen = sidebar.classList.toggle("open");
  mobileMenu.setAttribute("aria-expanded", String(isOpen));
});
quickAction.addEventListener("click", () => {
  if (currentPage === "contacts") {
    contactForm.elements.name.focus();
    return;
  }
  if (currentPage === "dashboard") {
    history.replaceState(null, "", "#contacts");
    showPage("contacts");
    contactForm.elements.name.focus();
    return;
  }
  notice.textContent = "This section is planned for a later CRM task. Contact records can be managed in Contacts.";
  notice.hidden = false;
});
contactSearch.addEventListener("input", () => loadContacts(contactSearch.value));
contactForm.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "";
  const formData = new FormData(contactForm);
  const body = Object.fromEntries(formData.entries());
  if (!body.name.trim()) {
    formMessage.textContent = "Please enter a contact name.";
    contactForm.elements.name.focus();
    return;
  }
  try {
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) {
      formMessage.textContent = result.error || "Could not save contact.";
      if (!body.name.trim()) contactForm.elements.name.focus();
      return;
    }
    contactForm.reset();
    formMessage.textContent = "Contact saved.";
    await loadContacts(contactSearch.value);
    contactForm.elements.name.focus();
  } catch {
    formMessage.textContent = "Could not reach the server. Please try again.";
  }
});
const initialPage = window.location.hash.slice(1);
showPage(pageContent[initialPage] ? initialPage : "dashboard");
