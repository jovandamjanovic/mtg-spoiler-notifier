var Crawler = require("crawler");
const https = require('https');

var c = new Crawler();
var cardsDb = [];

const checkCards = () => {
    console.log('polling magicspoilers!');
    c.queue([{
        uri: 'http://www.magicspoiler.com/mtg-set/commander-2018/',
        callback: function (error, res, done) {
            if (error) {
                console.log(error);
            } else {
                var $ = res.$;
                let cards = $(".spoiler-set-card")
                    .find("img")
                    .map(function (index, element) {
                        return {
                            name: $(element).attr('alt'),
                            link: $(element).parent().attr('href'),
                            image:$(element).attr('src')
                        };
                    })
                    .get();
                let newCards = cards.filter(c => cardsDb.indexOf(c.name) < 0);
                if (newCards.length > 0) {
                    cardsDb = cardsDb.concat(newCards.map(c => c.name));
                    sendEmailNotification(newCards);
                }
            }
            done();
        }
    }]);
}

const sendEmailNotification = (cards) => {
    let payload = {
        messageText: "New cards!",
        cards: cards.map((current, index) => `<a href='${current.link}'><br/><img src='${current.image}'></img><br/><span>${current.name}</span></a>`).join('')
    };
    const options = {
        hostname: 'hooks.zapier.com',
        path: '/hooks/catch/1911071/gu31c0/',
        method: 'POST'
    }
    const req = https.request(options, (res) => {
        console.log('Server responded with', res.statusCode);
    });
    req.on('error', e => {
        console.error(e.message);
    });
    // console.log(JSON.stringify(payload));
    req.write(JSON.stringify(payload));
    req.end();
}

setInterval(checkCards, 1800000);