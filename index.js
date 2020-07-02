const xml2json = require('xml2json');
const axios =  require('axios');
const moment = require('moment');
const keypress = require('keypress');

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

keypress(process.stdin);

process.stdin.on('keypress', function (ch, key) {
    if (key && [ 'escape', 'q' ].includes(key.name)) { process.exit(0); }

    if (key && key.name == 'h') { return moveFeed(-1); }
    if (key && key.name == 'j') { return scrollNews(1); }
    if (key && key.name == 'k') { return scrollNews(-1); }
    if (key && key.name == 'l') { return moveFeed(1); }

    // console.log('got "keypress"', key);
});

process.stdin.setRawMode(true);
process.stdin.resume();

const limitDefault = 20;
const limitArg = Number(process.argv[2] || limitDefault);
const limit = !isNaN(limitArg) ? limitArg : limitDefault;

const updateIntervalInMinutes = 5;
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
        feed.news = [].concat(content.item);
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
