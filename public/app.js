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
<style>
    body { font-size: 45px; }
    img { width: 100%; }

    #list {
        height: 100vh;
        width: 100vw;
        top: 0;
        left: 0;
        overflow-y: scroll;
    }

    #list .news .info {
        color: #bebebe;
    }

    #list .news .info {
        color: #bebebe;
    }

    #viewer {
        padding: 5px;
        boder: 1px solid black;
        background-color: #f9f9f9;
        height: 96vh;
        width: 100vw;
        position: fixed;
        top: 0;
        left: 0;
        overflow-y: scroll;
        display: none;
    }

    #viewer .header,
    #viewer .footer { width: 98vw; }

    #viewer .btn-close {
        float: right;
        color: black;
        font-size: 30px;
        margin-right: 4px;
    }

</style>

<div id="list">
</div>
<div id="viewer">
    <div class="header">
        <a class="btn-close" href="#">Fechar</a>
        <h1 class="title"></h1>
        <a class="external-link" href="#" target="_blank">visitar site</a>
    </div>
    <div class="content"></div>
    <div class="header">
        <a class="btn-close" href="#">Fechar</a>
    </div>
    <br><br><br>
    <br><br><br>
</div>
        `.trim(),
        item: (f) => `
<div class="news">
    <a href="#news/${f.id}">${f.title}</a><br>
    <span class="info">
        ${formatDate(f.pubDate)} - ${f.origin.split('-')[0].trim()}
    </span>
</div>
<br>
        `.trim()
    };

    $app.innerHTML = templates.app();

    const twoSeconds = 2 * 1000;
    const tenMinutes = 10 * 60 * 1000;

    function refresh(onDone) {
        fetch('/feeds').then((r) => r.json()).then(({ feeds }) => {
            window.feeds = feeds;
            const feed = feeds[0];
            const $list = root.document.querySelector('#list');

            $list.innerHTML = feed.news.map((f) => templates.item(f))
                .join('\n');

            const stillLoading = feeds.filter((f) => f.title === 'loading...')
                .length > 0;
            interval = stillLoading ? twoSeconds : tenMinutes;
            setTimeout(refresh, interval);
            if (onDone) { onDone(); }
        });
    }

    function findFeed(id) {
        return window.feeds[0].news.filter((f) => f.id === id)[0];
    }

    function setInViewer(cls, html, field = 'innerHTML') {
        root.document.querySelector(`#viewer .${cls}`)[field] = html;
    }

    function loadHash(ev) {
        const [ action, id ] = location.hash.replace('#', '').split('/');
        const $viewer = root.document.querySelector('#viewer');

        if (action === 'news') {
            const f = findFeed(id);
            if (f) {
                setInViewer('title', f.title);
                setInViewer('external-link', f.link, 'href');
                setInViewer('content', f.description);
                $viewer.style.display = 'block';
                $viewer.scrollTop = 0;
                return;
            }
        }

        $viewer.style.display = 'none';
    };

    root.onhashchange = loadHash;

    refresh(loadHash);

})(window);
