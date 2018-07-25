const Crawler = require("crawler");
const https = require('https');
const mongoose = require('mongoose');
const c = new Crawler();

mongoose.connect('mongodb://jovandamjanovic:jovan123@ds247001.mlab.com:47001/mtg-spoilers', { useNewUrlParser: true });
const cardSchema = new mongoose.Schema({
    name: String,
    link: String,
    image: String
});

const Card = mongoose.model('Card', cardSchema);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to db!');
    setInterval(checkCards, 900000);
});

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
                            image: $(element).attr('src')
                        };
                    })
                    .get();
                Promise.all(cards.map(async c => {
                    c.count = await Card.countDocuments({ name: c.name }).exec();
                    return c;
                }))
                .then(countedCards => {
                        console.info('Checking for cards already in db.')
                        return countedCards.filter(c => c.count === 0);
                    })
                    .then(newCards => {
                        if (newCards.length > 0) {
                            console.info('New cards spoiled!');
                            console.info('Saving into database.');
                            return newCards.map(c => {
                                var nc = new Card({
                                    name: c.name,
                                    link: c.link,
                                    image: c.image
                                });
                                nc.save();
                                return c;
                            });
                        } else {
                            console.info('No new cards.');
                            return newCards;
                        }
                    })
                    .then(cards => {
                        if(cards.length > 0) {
                            console.info('Sending email.');
                            sendEmailNotification(cards);
                        }
                    })
                    .catch((err) => {
                        console.log(err.message);
                    })
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