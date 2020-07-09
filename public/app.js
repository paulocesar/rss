(function startNewsApp(root) {
    function formatDate(dt) {
        dt = new Date(dt);

        function size(str, size) {
            return ('0'.repeat(size) + `${str}`).slice(-1 * size);
        }

        const day = size(dt.getDate(), 2);
        const month = size(dt.getMonth() + 1, 2);
        const year = dt.getFullYear();
        const hours = size(dt.getHours(), 2);
        const minutes = size(dt.getMinutes(), 2);
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    const $app = root.document.getElementById('app');
    const templates = {
        app: () => `
<h1>Notícias</h1>
<div id="list">
</div>
        `.trim(),
        item: (f) => `
<div class="news">
    ${formatDate(f.pubDate)}
    - ${f.origin.split('-')[0].trim()}
    - <a href="${f.link}">${f.title}</a>
</div>
        `.trim()
    };

    $app.innerHTML = templates.app();

    const twoSeconds = 2 * 1000;
    const tenMinutes = 10 * 60 * 1000;

    function refresh() {
        fetch('/feeds').then((r) => r.json()).then(({ feeds }) => {
            window.feeds = feeds;
            const feed = feeds[0];
            const $list = root.document.getElementById('list');

            $list.innerHTML = feed.news.map((f) => templates.item(f))
                .join('\n');

            const stillLoading = feeds.filter((f) => f.title === 'loading...')
                .length > 0;
            interval = stillLoading ? twoSeconds : tenMinutes;
            setTimeout(refresh, interval);
        });
    }

    refresh();
})(window);
