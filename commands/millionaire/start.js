const Discord = require('discord.js');
const db = require(process.env.NODE_PATH + '/handlers/db.js');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getEndEmbed() {
  let playerQues = db.get('playerQues').value();
  let sorted = [];
  for (let player in playerQues) {
    sorted.push([player, playerQues[player]]);
  }
  sorted.sort(function(a, b) {
    return b[1] - a[1];
  });
  sorted = sorted.map(
    (elem, index) =>
      (index < 3 ? '**' + elem[0] + '**' : elem[0]) + ' ' + elem[1]
  );
  return new Discord.RichEmbed()
    .setColor('#dbdb2c')
    .setTitle('Ăn lồn')
    .setTimestamp()
    .setFooter(
      'Ai la trieu phu',
      'https://upload.wikimedia.org/wikipedia/en/f/fe/Vietnam_millionaire.JPG'
    )
    .addField('Rank: ', sorted.join(' /n '));
}

module.exports = {
  name: 'start',
  aliases: [],
  category: 'millionaire',
  description: 'Start the game',
  run: async (client, message, args) => {
    let state = await db.get('state').value();
    if (state === 'playing')
      return message.reply('ANOTHER GAME IS PLAYING!!!!');
    if (state !== 'init') return message.reply('The game not setup yet');
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel)
      return message.channel.send('You need to be in a voice channel to play!');
    let connection = await voiceChannel.join();

    await db.set('state', 'playing').write();
    let questions = await db.get('questions').value();
    let players = await db.get('alivePlayers').value();
    let dispatcher = connection.playFile('./music/start.ogg', {
      type: 'ogg/opus'
    });
    dispatcher.on('end', async () => {
      for (let i = 1; i <= 15; i++) {
        if (state === 'end') {
          await db.set('state', 'end').write();
          dispatcher = connection.playFile('./music/end.ogg', {
            type: 'ogg/opus'
          });
          let embed = await getEndEmbed();
          return message.channel.send(embed);
        }
        dispatcher = connection.playFile('./music/' + getMusic(i, ''), {
          type: 'ogg/opus'
        });
        const msg = await message.channel.send(
          `:computer: LOADING QUESTION....`
        );
        try {
          await msg.react('🇦');
          await msg.react('🇧');
          await msg.react('🇨');
          await msg.react('🇩');
        } catch (err) {
          console.log('One of the emojis failed to react.');
        }

        let question = questions[i - 1];
        let answer = question.answer;

        await msg.edit(
          new Discord.RichEmbed()
            .setColor('#53b512')
            .setTitle('Câu hỏi số ' + i)
            .setTimestamp()
            .setFooter(
              'Ai la trieu phu',
              'https://upload.wikimedia.org/wikipedia/en/f/fe/Vietnam_millionaire.JPG'
            )
            .setDescription(question.question)
            .addField('Đáp án 🇦', question.A, true)
            .addField('Đáp án 🇧', question.B, true)
            .addBlankField()
            .addField('Đáp án 🇨', question.C, true)
            .addField('Đáp án 🇩', question.D, true)
        );

        let users = {};
        const filter = (reaction, user) => {
          if (user.bot || user.id in users || !players.includes(user.username))
            return false;
          users[user.id] = {
            answer: reaction.emoji.name,
            username: user.username
          };
          message.channel.send(user + ' ' + reaction.emoji.name);
          return ['🇦', '🇧', '🇨', '🇩'].includes(reaction.emoji.name);
        };
        await msg
          .awaitReactions(filter, { time: 15000 + i * 1000 })
          .then(async collected => {
            let correctAnswer = 0;
            for (let id in users) {
              if (users.hasOwnProperty(id)) {
                let userAnswer = users[id].answer;
                switch (userAnswer) {
                  case '🇦':
                    userAnswer = 'A';
                    break;
                  case '🇧':
                    userAnswer = 'B';
                    break;
                  case '🇨':
                    userAnswer = 'C';
                    break;
                  default:
                    userAnswer = 'D';
                }
                if (userAnswer !== answer) {
                  let index = players.indexOf(users[id].username);
                  if (index > -1) {
                    players.splice(index, 1);
                    db.set('playerQues.' + users[id].username, i).write();
                  }
                } else correctAnswer++;
              }
            }
            players = players.filter(elem => {
              let iftrue = Object.values(users)
                .map(user => user.username)
                .includes(elem);
              db.set('playerQues.' + elem, i).write();
              return iftrue;
            });
            db.set('quesNum', i).write();
            db.set('alivePlayers', players).write();
            if (players.length === 0) state = 'end';
            let fileName;
            if (correctAnswer >= Object.keys(users).length / 2)
              fileName = getMusic(i, 'dung');
            else fileName = getMusic(i, 'sai');
            dispatcher.end();
            dispatcher = connection.playFile('./music/' + fileName, {
              type: 'ogg/opus'
            });
            message.channel.send(
              'OUR ANWSER ISSSS:\n :regional_indicator_' +
                answer.toLocaleLowerCase() +
                ':'
            );
            message.channel.send(
              new Discord.RichEmbed()
                .setColor('#0099ff')
                .setTitle('Người chơi tiếp: ' + players.length)
                .setTimestamp()
                .setFooter(
                  'Ai la trieu phu',
                  'https://upload.wikimedia.org/wikipedia/en/f/fe/Vietnam_millionaire.JPG'
                )
                .addField(
                  'Danh sách',
                  players.length > 0 ? players.join('/n') : "Đéo có ai :'("
                )
            );
            await sleep(4000);
          });
      }
    });
  }
};
function getMusic(i, state) {
  switch (true) {
    case i <= 5:
      return '1-5' + state + '.ogg';
    default:
      return i + state + '.ogg';
  }
}
