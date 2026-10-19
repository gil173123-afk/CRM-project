const pageContent = {
  dashboard: { title: "Dashboard", description: "A clear view of your community relationships.", action: "＋ Add contact", showStats: true, heading: "Quick links", detail: "Choose a section from the menu to get started." },
  contacts: { title: "Contacts", description: "Find people and keep their information organized.", action: "＋ Add contact", heading: "Contact workspace", detail: "Contact creation and search will be added in the next CRM task." },
  memberships: { title: "Memberships", description: "Review membership status and renewals.", action: "＋ Add membership", heading: "Membership workspace", detail: "Membership records will be connected in a later step." },
  donations: { title: "Donations", description: "Keep donation records organized.", action: "＋ Add donation", heading: "Donation workspace", detail: "Donation records will be connected in a later step." },
  tasks: { title: "Tasks", description: "Track follow-ups and next steps.", action: "＋ Add task", heading: "Task workspace", detail: "Task tracking will be connected in a later step." },
  reports: { title: "Reports", description: "Review summaries from your workspace.", action: "Run report", heading: "Reports workspace", detail: "Reports will be available after the app data features are implemented." },
  settings: { title: "Settings", description: "Manage preferences for this workspace.", action: "Save settings", heading: "Workspace settings", detail: "Settings are a visual placeholder in this starter version." }
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

function showPage(pageName) {
  const page = pageContent[pageName] || pageContent.dashboard;
  pageTitle.textContent = page.title;
  pageDescription.textContent = page.description;
  breadcrumbPage.textContent = page.title;
  quickAction.textContent = page.action;
  stats.hidden = !page.showStats;
  panel.querySelector("h2").textContent = page.heading;
  panel.querySelector(".panel-heading p").textContent = page.detail;
  const quickLinks = panel.querySelector(".quick-links");
  if (pageName === "dashboard") {
    quickLinks.hidden = false;
  } else {
    quickLinks.hidden = true;
  }
  navLinks.forEach(link => {
    const selected = link.dataset.page === pageName;
    if (link.classList.contains("nav-link")) {
      link.classList.toggle("active", selected);
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  });
  notice.hidden = true;
  sidebar.classList.remove("open");
  mobileMenu.setAttribute("aria-expanded", "false");
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
  notice.textContent = "This menu action is a placeholder for the next CRM task. No records have been saved.";
  notice.hidden = false;
});

const initialPage = window.location.hash.slice(1);
showPage(pageContent[initialPage] ? initialPage : "dashboard");