window.addEventListener("load", () => {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // --- DOM Elements ---
  const loader = document.getElementById("loader");
  const errorView = document.getElementById("error-view");
  const errorMessage = document.getElementById("error-message");
  const retryButton = document.getElementById("retry-button");
  const mainView = document.getElementById("main-view");

  const userGreeting = document.getElementById("user-greeting");
  const userStatsGrid = document.getElementById("user-stats-grid");

  const adminView = document.getElementById("admin-leaderboard-container");
  const leaderboardBody = document.getElementById("leaderboard-body");
  const pageInfo = document.getElementById("page-info");
  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");

  // --- State ---
  let currentPage = 1;
  let totalPages = 1;
  const currentUser = tg.initDataUnsafe?.user;

  // --- Functions ---
  const showView = (view) => {
    loader.style.display = "none";
    errorView.style.display = view === "error" ? "block" : "none";
    mainView.style.display = view === "main" ? "block" : "none";
  };

  const showError = (message) => {
    errorMessage.textContent = message;
    showView("error");
  };

  const apiFetch = async (endpoint) => {
    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "Telegram-Data": tg.initData,
      },
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `API Error: ${response.status}`);
    }
    return response.json();
  };

  const renderUserStats = (stats) => {
    if (!stats) {
      userStatsGrid.innerHTML =
        "<p>We couldn't find any stats for you. Start by sending some messages in a group!</p>";
      return;
    }
    const statsMap = [
      { label: "Messages", value: stats.message_count },
      { label: "Words", value: stats.word_count },
      { label: "Avg. Words/Msg", value: stats.average_words },
      { label: "Stickers", value: stats.sticker_count },
      { label: "Media", value: stats.media_count },
    ];
    userStatsGrid.innerHTML = statsMap
      .map(
        (s) => `
            <div class="stat-card">
                <div class="label">${s.label}</div>
                <div class="value">${s.value.toLocaleString("en-US")}</div>
            </div>`
      )
      .join("");
  };

  const renderAdminLeaderboard = (users) => {
    if (!users || users.length === 0) {
      leaderboardBody.innerHTML =
        '<tr><td colspan="7">No users found.</td></tr>';
      return;
    }
    leaderboardBody.innerHTML = users
      .map(
        (user, index) => `
            <tr>
                <td>${(currentPage - 1) * 10 + index + 1}</td>
                <td class="user-cell">${user.first_name || ""} ${user.last_name || ""}</td>
                <td>${user.username ? `@${user.username}` : "-"}</td>
                <td>${user.message_count.toLocaleString("en-US")}</td>
                <td>${user.word_count.toLocaleString("en-US")}</td>
                <td>${user.sticker_count.toLocaleString("en-US")}</td>
                <td>${user.media_count.toLocaleString("en-US")}</td>
            </tr>
        `
      )
      .join("");
  };

  const updatePagination = (newCurrentPage, newTotalPages) => {
    currentPage = newCurrentPage;
    totalPages = newTotalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  };

  const fetchTopUsers = async (page) => {
    try {
      const data = await apiFetch(`/api/top-users?page=${page}`);
      renderAdminLeaderboard(data.users);
      updatePagination(data.currentPage, data.totalPages);
    } catch (error) {
      // Don't show a full error screen, just log it,
      // as the main user stats are still visible.
      console.error("Failed to load top users:", error);
      leaderboardBody.innerHTML = `<tr><td colspan="7">Error loading leaderboard.</td></tr>`;
    }
  };

  const initialize = async () => {
    try {
      if (!tg.initData) {
        throw new Error("This application must be launched from Telegram.");
      }

      // Set theme colors from Telegram
      document.documentElement.style.setProperty(
        "--bg-color",
        tg.themeParams.bg_color || "#ffffff"
      );
      document.documentElement.style.setProperty(
        "--text-color",
        tg.themeParams.text_color || "#000000"
      );
      document.documentElement.style.setProperty(
        "--hint-color",
        tg.themeParams.hint_color || "#999999"
      );
      document.documentElement.style.setProperty(
        "--link-color",
        tg.themeParams.link_color || "#2481cc"
      );
      document.documentElement.style.setProperty(
        "--button-color",
        tg.themeParams.button_color || "#2481cc"
      );
      document.documentElement.style.setProperty(
        "--button-text-color",
        tg.themeParams.button_text_color || "#ffffff"
      );
      document.documentElement.style.setProperty(
        "--secondary-bg-color",
        tg.themeParams.secondary_bg_color || "#f4f4f5"
      );

      const data = await apiFetch("/api/stats");

      // Set user greeting
      userGreeting.textContent = `Hello, ${currentUser.first_name}!`;

      // Render user's personal stats
      renderUserStats(data.stats);

      // If user is admin, show admin panel and fetch data
      if (data.isAdmin) {
        adminView.style.display = "block";
        await fetchTopUsers(1);
      }

      showView("main");
    } catch (error) {
      console.error("Initialization failed:", error);
      showError(error.message);
    }
  };

  // --- Event Listeners ---
  retryButton.addEventListener("click", initialize);
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      fetchTopUsers(currentPage - 1);
    }
  });
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      fetchTopUsers(currentPage + 1);
    }
  });

  // --- Start ---
  initialize();
});
