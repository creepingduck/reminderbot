require('dotenv').config();
const config = require('./config.json')
const moment = require('moment')
const Discord = require("discord.js")
const mongoInit = require("./database/monooseInit");
const GuildModel = require("./database/guild")
const bot = new Discord.Client()


function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
function strCmp(a, b){
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;
}

function TimerDataToMsec(timerDataObj){
    const names = ["seconds", "minutes", "hours"];

    if (!Object.keys(timerDataObj).some(o => names.some(n => n == o))){
        return 0;
    }

    var time = 0;
    
    names.forEach((o, i) => {
        if (timerDataObj[o]){
            time += +timerDataObj[o] * Math.pow(60, i);
        }
    });

    return time * 1000;
}

const WaitingTime = TimerDataToMsec(config.waitingTime);
const UpdateTime = TimerDataToMsec(config.updateTime);

var TextChannel;
var EndTime;
var Timer;
var GuildObject;

function SetupTextChannel (){
    let id = Object.keys(config.channel)[0]; // id канала из конфига
    let channel = bot.channels.get(id); // Поиск по id
    if (!channel){
        channel = bot.channels.find(config.channel[id]); // Поиск по имени
    }
    if (!channel){
        throw "Невозможно найти требуемый канал на серверах!";
    }else{
        TextChannel = channel;
    }
}

function RunTimer (customWaitingTime){
    if (Timer){
        clearTimeout(Timer);
    }

    Timer = setTimeout(
        () => { 
            console.log(`Таймер сработал!`);
            TextChannel.send(getNotificationMsg());
            Timer = null;
            EndTime = 0;
            SaveTimer();
        },
        customWaitingTime ? customWaitingTime : WaitingTime
    );
    EndTime = Date.now() + (customWaitingTime ? customWaitingTime : WaitingTime);
    console.log(`Запуск таймера. Он сработает ${moment(EndTime + 4 * 60 * 60 * 1000).format()}`);
    SaveTimer();
}

async function SaveTimer (customEndTime){
    GuildObject.timer = customEndTime ? customEndTime : EndTime;
    GuildObject.save();
    console.log(`Сохранение таймера`);
}

async function LoadTimer (){
    let timeToExec;
    try{
        timeToExec = GuildObject.timer;
    }
    catch(e){}

    if(!isNaN(timeToExec) && timeToExec > Date.now()){
        console.log(`Загрузка предыдущего таймера. Он сработает через ${moment(timeToExec - Date.now()).format("HH:mm:ss")}`);
        RunTimer(timeToExec - Date.now());
    }else{
        console.log(`Загрузка предыдущего таймера. Его нет`);
    }
}

function getNotificationMsg (){
    return `<@&${Object.keys(config.notificateRole)[0]}> ${config.advancedMessages[getRandomInt(config.advancedMessages.length-1)]}`;
}

function isExecuteMsg (msg) {
    return msg.embeds.length && msg.embeds[0].description && (
    msg.member.id == '315926021457051650' && 
    msg.embeds[0].description.startsWith('[Top Discord Servers](https://discord-server.com/)\nServer bumped by') ||
    msg.member.id == '464272403766444044' &&
    msg.embeds[0].description.startsWith('Нравится сервер?\nОцени его на [сайте](https://server-discord.com/')
    ) || (msg.content == "_run" && msg.member._roles.some((o) => Object.keys(config.devRoles).some((d) => d == o)));//////////////////////////////////////////////////////////////////////////////////////////////////
}


bot.on("ready", async () => {
    SetupTextChannel();
    console.info(`Logged in as ${bot.user.tag}!`);
    LoadTimer();
  
});

bot.on("message",async msg => {
    if (msg.channel.id != TextChannel.id){
        return;
    }
    TextChannel = msg.channel;
        
    if(msg.author.id === "302050872383242240"){
      console.log(msg.embeds[0].description)
    }
    
    //Execute
    if (isExecuteMsg(msg)){
        if (Timer){
            if (Date.now() <= (EndTime - WaitingTime + UpdateTime)){
                console.log(`=Таймер обновлён`);
                TextChannel.send("Таймер обновлён");
                RunTimer();
            }else{
                console.log(`=Таймер не обновлён. Время на обновление таймера истекло`);
                TextChannel.send("Время на обновление таймера истекло");
            }
        }else{
            console.log(`=Таймер запущен`);
            TextChannel.send("Таймер запущен");
            RunTimer();
        }
        return;
    }

    // Remain
    if (strCmp(msg.content, config.commands._prefix + config.commands.timeRemain)){
        var answer = Timer ? "Времени осталось до оповещения: " + moment.utc(moment(EndTime).diff(moment())).format("HH:mm:ss") :
        "Таймер не был запущен";
        console.log(`=Осталось до срабатывания таймера. ${answer}`);
        TextChannel.send(answer);
        return;
    }

    // Reset
    if (strCmp(msg.content, config.commands._prefix + config.commands.resetTimer) && 
    msg.member.roles.some((o) => Object.keys(config.devRoles).some((d) => d == o.id) )){
        console.log(`=Таймер сброшен`);
        if (Timer){
            clearTimeout(Timer);
            TextChannel.send("Таймер был сброшен");
            Timer = null;
            EndTime = 0;
            SaveTimer();
        }else{
            TextChannel.send("Таймер не был даже запущен");
        }
        return;
    }

    // Help
    if (strCmp(msg.content, config.commands._prefix + config.commands.help)){
        
        const embed = new Discord.RichEmbed()
        // Set the title of the field
        .setTitle('Help')
        // Set the color of the embed
        .setColor(0xFFFF00)
        // Set the main content of the embed
        .setDescription(`
        Данный бот является улучшенным таймером из микроволновки.
        Время между бампом и последующим оповещением - 4 часа.

        **Команды:**
        _remain - Оставшееся время до срабатывания
        _help - Вывод этой справки
        _sub - Подписаться на уведомления бота
        _unsub - Отписаться от уведомлений бота
        _reset - Сброс текущего таймера (Только Модераторам и выше)
        _run - Запуск таймера (Только Модераторам и выше)`);
        TextChannel.send(embed);
        return;
    }

    // Subscribe
    if (strCmp(msg.content, config.commands._prefix + config.commands.subscribe)){
        if (!(msg.member.roles.some((o) => o.id == Object.keys(config.notificateRole)[0]))){

            await msg.member.addRole(Object.keys(config.notificateRole)[0]).catch(console.error);
            TextChannel.send("Вы подписались на уведомления");
              //.catch(TextChannel.send("Не удалось подписать вас на уведомления"));
            console.log(`=Пользователь ${msg.member.user.username} подписался на рассылку`);
        }else{
            TextChannel.send("Вы уже подписаны на уведомления");
        }
        return;
    }

    // UnSubscribe
    if (strCmp(msg.content, config.commands._prefix + config.commands.unsubscribe)){
            if (msg.member.roles.some((o) => o.id == Object.keys(config.notificateRole)[0])){
                await msg.member.removeRole(Object.keys(config.notificateRole)[0])
                TextChannel.send("Вы отписались от уведомлений");
                //.catch(TextChannel.send("Не удалось отписать вас от уведомлений"));
                
                console.log(`=Пользователь ${msg.member.user.username} отписался от рассылки`);
            }else{
                TextChannel.send("Вы не были подписаны на уведомления");
            }
            return;
    }
});


async function run (){
    await mongoInit().catch(console.error);
    GuildObject = await GuildModel.findOne({guildID: "698474167896506368"});
    bot.login(process.env.TOKEN).catch(console.error);
    //console.log(GuildModel.create({guildID: "698474167896506368"}).catch(console.error));
    //console.log("Running...");
}
run();
//
// "698609590400712764" : "📈продвижение-сервера"