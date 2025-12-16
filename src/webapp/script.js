document.addEventListener("alpine:init", () => {
  Alpine.data("statsApp", () => ({
    loading: true,
    error: null,
    user: window.Telegram.WebApp.initDataUnsafe?.user,
    isAdmin: false,
    view: "stats", // stats, groups, users, restricted

    // Stats Data
    stats: {},

    // Groups Data
    groupsList: [],
    groupsPage: 1,
    groupsTotalPages: 1,

    // Users Data
    usersList: [],
    usersPage: 1,
    usersTotalPages: 1,

    // New properties
    restricted: false,
    botUsername: "",

    async init() {
      // Check if running inside Telegram
      if (!window.Telegram?.WebApp?.initData) {
        this.restricted = true;
        this.view = "restricted";
        this.loading = true;

        try {
          const res = await fetch("/public/info");
          const data = await res.json();
          this.botUsername = data.botUsername;
        } catch (_e) {
          this.error = "Failed to load bot info";
        } finally {
          this.loading = false;
        }
        return;
      }

      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand(); // Optional: Expand to full height

      // Set theme parameters
      this.applyTheme();

      // Listen for theme changes
      window.Telegram.WebApp.onEvent("themeChanged", () => {
        this.applyTheme();
      });

      try {
        await this.fetchMyStats();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    async api(endpoint) {
      const headers = {
        "Content-Type": "application/json",
        "Telegram-Data": window.Telegram.WebApp.initData,
      };

      const res = await fetch(`/api${endpoint}`, { headers });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return await res.json();
    },

    async fetchMyStats() {
      const data = await this.api("/stats");
      console.log("Stats data:", data);
      this.stats = data.stats || {};
      this.isAdmin = data.isAdmin;
    },

    async loadGroups(page) {
      this.loading = true;
      this.view = "groups";
      try {
        const data = await this.api(`/groups?page=${page}`);
        this.groupsList = data.groups;
        this.groupsPage = data.currentPage;
        this.groupsTotalPages = data.totalPages;
      } catch (_e) {
        this.error = "Failed to load groups";
      } finally {
        this.loading = false;
      }
    },

    async loadUsers(page) {
      this.loading = true;
      this.view = "users";
      try {
        const data = await this.api(`/users?page=${page}`);
        this.usersList = data.users;
        this.usersPage = data.currentPage;
        this.usersTotalPages = data.totalPages;
      } catch (_e) {
        this.error = "Failed to load users";
      } finally {
        this.loading = false;
      }
    },

    formatNumber(num) {
      return new Intl.NumberFormat("en-US").format(num);
    },

    formatDate(dateString) {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .format(date)
        .replace(/,/g, "");
    },

    applyTheme() {
      const tg = window.Telegram.WebApp;
      const root = document.documentElement;
      const p = tg.themeParams;

      root.style.setProperty("--tg-bg", p.bg_color || "#fff");
      root.style.setProperty("--tg-text", p.text_color || "#000");
      root.style.setProperty("--tg-hint", p.hint_color || "#999");
      root.style.setProperty("--tg-link", p.link_color || "#2481cc");
      root.style.setProperty("--tg-button", p.button_color || "#2481cc");
      root.style.setProperty("--tg-button-text", p.button_text_color || "#fff");
      root.style.setProperty(
        "--tg-secondary-bg",
        p.secondary_bg_color || "#f4f4f5"
      );
    },
  }));
});
