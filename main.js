const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv')
const { DateTime } = require("luxon")

dotenv.config()

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK
if (!DISCORD_WEBHOOK) {
    console.error('Please provide DISCORD_WEBHOOK environment variable')
    process.exit(1)
}

const COOLDOWN = process.env.COOLDOWN || 30
const WEBHOOK_USERNAME = process.env.WEBHOOK_USERNAME || 'WhatsApp Relay'

// Store last notification sent time, where key is chat name and value is luxon DateTime
let lastSent = {}

const client = new Client({
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    authStrategy: new LocalAuth({
        dataPath: '/data/wwebjs'
    }),
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message', message => {
    const chatName = 'global' // for now just go for single cooldown
	if (lastSent[chatName]) {
        // Use .negate() to turn negative seconds to positive
        const lastSentSecond = lastSent[chatName].diffNow().negate().as('seconds')
        if (lastSentSecond <= COOLDOWN) {
            return
        }
    }

    // wait 5 seconds then check chat unread count
    // if no unread message, dont send webhook
    setTimeout(() => {
        message.getChat().then((chat) => {
            if (chat.unreadCount > 0) {
                fetch(DISCORD_WEBHOOK, {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: WEBHOOK_USERNAME,
                        content: 'New WhatsApp message received'
                    })
                }).then((resp) => {
                    lastSent[chatName] = DateTime.now()
            
                }).catch(error => {
                    console.error('Failed to send webhook')
                    console.error(error)
                })
            }
        })
    }, 5000)
});

client.initialize();