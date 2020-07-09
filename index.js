const xml2json = require('xml2json');
const axios =  require('axios');
const moment = require('moment');
const keypress = require('keypress');
const express = require('express');

const urls = [
    'https://g1.globo.com/rss/g1/',
    'http://feeds.bbci.co.uk/portuguese/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'
];

const feeds = urls.map((url) => ({ title: 'loading...', url, news: [ ] }));
feeds.unshift({ title: 'Todas', url: null, news: [ ] });

let currentTab = 0;
let currentIndex = 0;

process.on('uncaughtException', function onUncaughException(err) {
    clearInterval(timer);
    process.exit(1);
});

const limitDefault = 20;
const limitArg = Number(process.argv[2] || limitDefault);
const limit = !isNaN(limitArg) ? limitArg : limitDefault;

const isWebServer = process.argv.includes('web');

if (!isWebServer) {
    keypress(process.stdin);

    process.stdin.on('keypress', function (ch, key) {
        // console.log('got "keypress"', key);
        if (!key) { return; }

        if ([ 'q', 'escape' ].includes(key.name)) { process.exit(0); }

        if ([ 'h', 'left' ].includes(key.name)) { return moveFeed(-1); }
        if ([ 'j', 'down' ].includes(key.name)) { return scrollNews(1); }
        if ([ 'k', 'up' ].includes(key.name)) { return scrollNews(-1); }
        if ([ 'l', 'right' ].includes(key.name)) { return moveFeed(1); }
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
}

const updateIntervalInMinutes = 10;
const interval = 1000 * 60 * updateIntervalInMinutes;
let timer = null;

function sortByDate(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate);
}

async function readFeed(feed) {
    if (!feed.url) { return; }
    const response = await axios.get(feed.url);
    if (response.status === 200 && response.statusText === 'OK') {
        const xml = response.data;
        const json = JSON.parse(xml2json.toJson(xml));
        const content = json.rss.channel;

        feed.title = content.title;
        feed.news = [].concat(content.item).map((i) => {
            i.origin = feed.title;
            return i;
        });
        feed.news.sort(sortByDate);
        populateNews();
    }
}

async function refreshNews() {
    try {
        for (const r of feeds.map((f) => readFeed(f))) {
            await r;
        }
    } catch(ex) {
        console.error(ex);
    }

    populateNews();
    timer = setTimeout(refreshNews, interval);
}

function populateNews() {
    feeds[0].news = [];
    feeds[0].news = feeds.reduce((a, f) => a.concat(f.news), []);
    feeds[0].news.sort(sortByDate);

    renderNews();
}

function renderNews() {
    if (isWebServer) { return false; }

    const { title, news } = feeds[currentTab];
    const page = news.slice(currentIndex, currentIndex + limit);

    console.clear();
    console.log(feeds.map(({ title }, idx) => {
        const w = idx === currentTab ? ' * ' : '   ';
        return `${w}${title.slice(0, 12).split('-')[0].trim()}${w}`;
    }).join(' | '));
    console.log();

    for (const idx in page) {
        const n = page[idx];
        const no = `00${Number(idx) + currentIndex + 1}`.slice(-3);
        const date = moment(n.pubDate).format('HH:mm YYYY/MM/DD');
        console.log(` ${no} ${date} - ${n.title}`);
        console.log(`     \x1b[2m${n.link}\x1b[0m`);
    }

    return true;
}

function moveFeed(direction) {
    const nextTab = currentTab + direction;
    if ((nextTab < 0) || (nextTab > (feeds.length - 1))) { return; }

    currentTab = nextTab;
    currentIndex = 0;

    renderNews();
}

function scrollNews(direction) {
    const feed = feeds[currentTab];
    const nextIndex = currentIndex + direction;

    if ((nextIndex < 0) || (feed.news.length < (nextIndex + limit))) {
        return;
    }

    currentIndex = nextIndex;
    renderNews();
}

async function main() {
    console.clear();
    console.log('loading...');
    await refreshNews();
}

main();

if (!isWebServer) { return; }

const app = express();
const port = 80;

app.get('/', (req, res) => {
    res.status(200).send(`
<!DOCTYPE html>
<html>
    <head><title>News</title></head>
    <body>
        <div id="app"><p>Loading...</p></div>
        <script type="text/javascript" src="/app.js"></script>
    </body>
</html>
    `.trim());
});

app.get('/feeds', (req, res) => {
    res.json({ feeds });
});

app.use(express.static('public'));

app.listen(port, console.log('web server is running'));
