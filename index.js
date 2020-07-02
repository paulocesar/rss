const xml2json = require('xml2json');
const axios =  require('axios');
const moment = require('moment');

const urls = [
    'https://g1.globo.com/rss/g1/'
];

const limitDefault = 10;
const limitArg = Number(process.argv[2] || 10);
const limit = !isNaN(limitArg) ? limitArg : limitDefault;

const interval = 1000 * 60 * 20;
let timer = null;

process.on('uncaughtException', function onUncaughException(err) {
    clearInterval(timer);
});

async function main() {
    try {
        const response = await axios.get(urls[0]);
        if (response.status === 200 && response.statusText === 'OK') {
            const xml = response.data;
            const json = JSON.parse(xml2json.toJson(xml));
            const content = json.rss.channel;
            const title = content.title;
            const news = [].concat(content.item);

            news.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

            console.clear();
            console.log(title.toUpperCase());
            const prefix = '  ';

            for (const n of news.slice(0, limit)) {
                const date = moment(n.pubDate).format('HH:mm YYYY/MM/DD');
                console.log(`${prefix}${date} - ${n.title}`);
                console.log(`${prefix}${n.link}`);
                console.log();
            }
        }
    } catch(ex) {
        console.error(ex);
    }
    timer = setTimeout(main, interval);
}

console.clear();
main();
