require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const request = require('request');
const fs = require('fs');
const telegramBotToken = process.env.BOT_TOKEN;
const folderId = process.env.FOLDER_ID;
const yandexToken = process.env.YANDEX_TOKEN;
const bot = new Telegraf(telegramBotToken);

bot.start((ctx) => ctx.reply(`Greetings, ${ctx.message.from.username}`));
bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on('message', async (ctx) => {
  const fileID = ctx.update.message.voice.file_id;
  const response = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${fileID}`
  );
  const rez = await response.json();
  console.log(ctx.update.message);

  const file = fs.createWriteStream('file.ogg');

  function sound2Text(fileName) {
    let binary = fs.readFileSync(`./${fileName}`);

    const options = {
      method: 'POST',
      url: `https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&topic=general&profanityFilter=false&format=oggopus&sampleRateHertz=16000&folderId=${folderId}`,
      headers: {
        'Content-Type': 'audio/ogg',
        Authorization: `Bearer ${yandexToken}`,
      },
      body: binary,
    };
    request(options, (error, response) => {
      if (error) throw new Error(error);
      console.log('\x1b[1m\x1b[33m%s\x1b[0m', JSON.parse(response.body).result);
    });
  }
  fetch(
    `https://api.telegram.org/file/bot${telegramBotToken}/${rez.result.file_path}`
  )
    .then(
      (response) =>
        new Promise((resolve, reject) => {
          response.body.pipe(file);
          file.on('finish', () => {
            setTimeout(() => {
              resolve();
            });
          });
        })
    )
    .then(() => {
      sound2Text('file.ogg');
    });
});
bot.launch();