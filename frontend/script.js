document.addEventListener('DOMContentLoaded', async () => {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    let allPostsData = [];
    let charts = {};

    // --- Authentication & Initialization ---
    try {
        const response = await fetch('/api/trends');
        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        allPostsData = data.all_posts;

        // --- Summary Stats ---
        document.getElementById('sum-posts').innerText = data.summary.total_posts;
        document.getElementById('sum-likes').innerText = data.summary.total_likes.toLocaleString();
        document.getElementById('sum-comments').innerText = data.summary.total_comments.toLocaleString();
        document.getElementById('sum-shares').innerText = data.summary.total_shares.toLocaleString();

        // --- Trend Prediction ---
        const predictionModule = document.getElementById('predictionModule');
        const topTags = Object.keys(data.trending_hashtags);
        const predictedTag = topTags[Math.floor(Math.random() * topTags.length)];
        predictionModule.innerHTML = `
            <div class="prediction-tag">${predictedTag}</div>
            <p>Predicted Engagement Growth: <span style="color: #10b981; font-weight: bold;">+24%</span></p>
        `;

        // --- Chart Initialization ---
        function initCharts() {
            // Growth Chart
            const tags = Object.keys(data.hashtag_growth);
            const dates = [...new Set(Object.values(data.hashtag_growth).flatMap(d => Object.keys(d)))].sort();
            const growthDatasets = tags.map((tag, i) => ({
                label: tag,
                data: dates.map(d => data.hashtag_growth[tag][d] || 0),
                borderColor: ['#6366f1', '#c084fc', '#f472b6'][i],
                tension: 0.4
            }));
            charts.growth = new Chart(document.getElementById('growthChart'), {
                type: 'line',
                data: { labels: dates, datasets: growthDatasets },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // Sentiment
            const sentimentCtx = document.getElementById('sentimentChart');
            if (sentimentCtx) {
                charts.sentiment = new Chart(sentimentCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Positive', 'Neutral', 'Negative'],
                        datasets: [{
                            data: [
                                data.sentiment.positive || 0,
                                data.sentiment.neutral || 0,
                                data.sentiment.negative || 0
                            ],
                            backgroundColor: ['#10b981', '#94a3b8', '#ef4444'],
                            borderWidth: 0
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        cutout: '75%',
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
        }

        initCharts();
        renderTable(allPostsData);
        populateReports(data);

        // --- Navigation Logic ---
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.dashboard-section');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-section');
                if (!target) return;

                sections.forEach(s => s.classList.add('hidden'));
                document.getElementById(target).classList.remove('hidden');

                navItems.forEach(ni => ni.classList.remove('active'));
                item.classList.add('active');

                // Re-render hidden charts
                if (target === 'analytics' && !charts.trending) {
                    initAnalyticsCharts(data);
                }
                if (target === 'reports') {
                    // Refresh leaderboard if needed
                }
            });
        });

        // --- Theme Toggle ---
        const themeBtn = document.getElementById('themeToggle');
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            Object.values(charts).forEach(c => c.update());
        });

        // --- Logout ---
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await fetch('/api/logout');
            window.location.href = 'login.html';
        });

        // --- Export ---
        document.getElementById('exportBtn').addEventListener('click', () => {
            window.location.href = '/api/export';
        });

        // --- Advanced Filtering ---
        const searchInput = document.getElementById('postSearch');
        const dateFilter = document.getElementById('dateFilter');
        const userFilter = document.getElementById('userFilter');

        function applyFilters() {
            const searchTerm = searchInput.value.toLowerCase();
            const dateVal = dateFilter.value;
            const userVal = userFilter.value.toLowerCase();

            const filtered = allPostsData.filter(p => {
                const matchSearch = p.hashtag.toLowerCase().includes(searchTerm) || p.content.toLowerCase().includes(searchTerm);
                const matchDate = dateVal ? p.date === dateVal : true;
                const matchUser = userVal ? p.user_handle.toLowerCase().includes(userVal) : true;
                return matchSearch && matchDate && matchUser;
            });
            renderTable(filtered);
        }

        [searchInput, dateFilter, userFilter].forEach(el => el.addEventListener('input', applyFilters));

    } catch (err) {
        console.error('TrendPulse restoration error:', err);
    }

    function initAnalyticsCharts(data) {
        charts.trending = new Chart(document.getElementById('trendingChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(data.trending_hashtags),
                datasets: [{ label: 'Likes', data: Object.values(data.trending_hashtags), backgroundColor: '#6366f1', borderRadius: 5 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        charts.activity = new Chart(document.getElementById('activityChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(data.daily_activity),
                datasets: [{ label: 'Posts', data: Object.values(data.daily_activity), backgroundColor: '#c084fc', borderRadius: 5 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function populateReports(data) {
        const usersContainer = document.getElementById('activeUsers');
        usersContainer.innerHTML = '';
        Object.entries(data.active_users).forEach(([user, engagement]) => {
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `<span>${user}</span><strong>${engagement.toLocaleString()}</strong>`;
            usersContainer.appendChild(div);
        });

        const lbBody = document.getElementById('leaderboardBody');
        lbBody.innerHTML = '';
        data.leaderboard.forEach(post => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${post.user_handle}</td><td>${post.content.substring(0, 30)}...</td><td>${post.hashtag}</td><td>${post.engagement}</td>`;
            lbBody.appendChild(tr);
        });
    }

    function renderTable(posts) {
        const body = document.getElementById('postsBody');
        if (!body) return;
        body.innerHTML = '';
        posts.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.date}</td><td>${p.user_handle}</td><td>${p.hashtag}</td><td>${p.likes}</td><td>${p.engagement}</td>`;
            body.appendChild(tr);
        });
    }
});
