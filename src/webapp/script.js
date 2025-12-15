window.addEventListener("load", () => {
	const tg = window.Telegram.WebApp;
	tg.ready();
	tg.expand();

	const loader = document.getElementById("loader");
	const errorEl = document.getElementById("error");
	const mainEl = document.getElementById("main");
	const groupTitleEl = document.getElementById("group-title");
	const leaderboardEl = document.getElementById("leaderboard");
	const adminControlsEl = document.getElementById("admin-controls");
	const groupSelectEl = document.getElementById("group-select");

	const initData = tg.initDataUnsafe || {};
	const user = initData.user;
	const chat = initData.chat;

	function showError(message) {
		loader.style.display = "none";
		mainEl.style.display = "none";
		errorEl.textContent = message;
		errorEl.style.display = "block";
	}

	async function fetchAndRenderStats(groupId) {
		loader.style.display = "block";
		mainEl.style.display = "none";
		leaderboardEl.innerHTML = ""; // Clear previous stats

		try {
			// We'll need to pass the initData to the backend for validation
			const response = await fetch(`/api/stats/${groupId}`, {
				headers: {
					"Content-Type": "application/json",
					"Telegram-Data": tg.initData,
				},
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.error || `HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.groupTitle) {
				groupTitleEl.textContent = data.groupTitle;
			}

			renderLeaderboard(data.stats);

			loader.style.display = "none";
			mainEl.style.display = "block";
			tg.MainButton.hide();
		} catch (error) {
			console.error("Error fetching stats:", error);
			showError(`Failed to load stats. ${error.message}`);
			tg.MainButton.show()
				.setText("Retry")
				.onClick(() => fetchAndRenderStats(groupId));
		}
	}

	function renderLeaderboard(stats) {
		if (!stats || stats.length === 0) {
			leaderboardEl.innerHTML =
				'<tr><td colspan="7">No activity recorded in this group yet.</td></tr>';
			return;
		}

		leaderboardEl.innerHTML = stats
			.map(
				(user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td class="user-cell">${user.first_name || ""} ${user.last_name || ""}</td>
                <td>${user.message_count}</td>
                <td>${user.word_count}</td>
                <td>${user.average_words}</td>
                <td>${user.sticker_count}</td>
                <td>${user.media_count}</td>
            </tr>
        `,
			)
			.join("");
	}

	async function initialize() {
		if (!chat || !chat.id) {
			// For local testing if not launched from Telegram
			console.warn("Not launched from Telegram or chat info is missing.");
			showError(
				"Please open this web app from the /stats command in a Telegram group.",
			);
			groupTitleEl.textContent = "Local Test";
			const testGroupId = -1001234567890; // Example group ID
			await setupAdminControls(user?.id);
			await fetchAndRenderStats(testGroupId);
			return;
		}

		groupTitleEl.textContent = `Top 10 Users in ${chat.title}`;

		await setupAdminControls(user?.id);
		await fetchAndRenderStats(chat.id);

		groupSelectEl.addEventListener("change", (e) => {
			const selectedGroupId = e.target.value;
			fetchAndRenderStats(selectedGroupId);
		});
	}

	async function setupAdminControls(userId) {
		try {
			const response = await fetch(`/api/admin/groups?userId=${userId}`, {
				headers: { "Telegram-Data": tg.initData },
			});
			if (response.ok) {
				const { groups } = await response.json();
				if (groups && groups.length > 0) {
					groupSelectEl.innerHTML = groups
						.map(
							(g) =>
								`<option value="${g.id}" ${g.id === (chat?.id || groups[0].id) ? "selected" : ""}>${g.title}</option>`,
						)
						.join("");
					adminControlsEl.style.display = "block";
				}
			}
		} catch (error) {
			console.error("Could not fetch admin groups", error);
		}
	}

	initialize();
});
