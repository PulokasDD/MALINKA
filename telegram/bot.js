require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const request = require('request');
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('./user');
const Home = require('./home');
const telegramBotToken = process.env.BOT_TOKEN;
const folderId = process.env.FOLDER_ID;
const yandexToken = process.env.YANDEX_TOKEN;
const mongoDB = process.env.MONGOOSE_DB;
const bot = new Telegraf(telegramBotToken);

mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.once('open', async () => {
  console.log('MongoDB database connection established successfully');
});

const checkIfRegistered = async (ctx, next) => {
  const userFound = await User.findOne({ tgLogin: ctx.message.from.username });
  if (userFound) {
    await next();
  } else {
    ctx.reply(
      `Dear, ${ctx.message.from.username}! You have not been registered by our managers`
    );
  }
};

const giveNameToFile = (userIdTg)=>{
  let localDate = (new Date(Date.now())).toISOString().toString().slice(0,-5)

  const dir = `./allTheSounds/${userIdTg}`;

  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  return `./allTheSounds/${userIdTg}/${userIdTg}_${localDate}.ogg`
}

bot.use(checkIfRegistered);

bot.start(async (ctx) => {
  ctx.reply(`Greetings, ${ctx.message.from.username}`);
});

bot.help(async (ctx) => {
  ctx.reply(`I am ready to give you a hand, ${ctx.message.from.username}`);
});
bot.command('myHomes', async (ctx) => {
  let userHomes = await User.findOne({
    tgLogin: ctx.update.message.from.username,
  }).populate('homes');
  let userHomesToReturn = userHomes.homes.map((eachHome) => `${eachHome.name}`);
  console.log(ctx.update.message);
  ctx.reply(`Here is the list of your homes:\n${userHomesToReturn.join('\n')}`);
});
bot.on('message', async (ctx) => {
  if (!ctx.update.message.voice) {
    ctx.reply('Could you please send Audio message instead');
    return;
  }
  try {
    const fileID = ctx.update.message.voice.file_id;
    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${fileID}`
    );
    const rez = await response.json();
    let nameOfTheFile = giveNameToFile(ctx.update.message.from.id)

    const file = fs.createWriteStream(nameOfTheFile);

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
        console.log(
          '\x1b[1m\x1b[33m%s\x1b[0m',
          JSON.parse(response.body).result
        );
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
        sound2Text(nameOfTheFile);
      });
  } catch (error) {
    console.log('Unfortunately, we have got an error, milord\n', error);
  }
});
bot.launch();