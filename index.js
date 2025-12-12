// index.js (Railway-ready, health endpoint)
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, ChannelType, ActivityType } = require('discord.js');
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const config = require('./bot_config');
const GetImage = require('./getImage');
const KeyDynamic = require('./keyDynamic');

// ---------------------
// Simple express health (ให้ Railway เช็คว่ารันอยู่)
// ---------------------
const app = express();
app.get('/', (req, res) => res.send('xSwift Status Bot — alive'));
app.get('/healthz', (req, res) => res.send({ ok: true, uptime: process.uptime() }));

const port = Number(config.port || process.env.PORT || 3000);
app.listen(port, () => {
    console.log(`🚀 Health server listening on port ${port}`);
});

// ---------------------
// Discord client (bot account)
// ---------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const selfbotClients = new Map();
const SUCCESS = '#00ff00';
const FAILED = '#ff0000';
const WARNING = '#ffff00';

// ---------- UI / Helpers / Core logic (เหมือนของเดิม) ----------
// MAIN UI EMBED
const UI = {
    mainEmbed: () => new EmbedBuilder()
        .setTitle('``꒰🍀꒱`` บริการทำสถานะอัตโนมัติ (ฟรี)')
        .setDescription(
            '**``꒰🌿꒱`` ทำสถานะสตรีมมิ่งที่หน้าโปรไฟล์ผ่านบอท\n' +
            '``꒰☘️꒱`` ระบบทำสถานะอัตโนมัติ 24 ชั่วโมง ฟรี!\n' +
            '``꒰🌲꒱`` สถานะจะออนตลอดไม่ดับถึงแม้ว่าจะออฟไลน์\n' +
            '``꒰🌴꒱`` ตั้งค่าชื่อสถานะได้ตามใจ ประทับใจแน่นอน**'
        )
        .setImage('https://cdn.discordapp.com/attachments/1373550875435470869/1403150070483783844/20250808_055344_0000.png?ex=689680d6&is=68952f56&hm=c7f36c7295a69ee1d862083b5e7251d64ebc8666ed0748ca0a4c3987a03eaa71&'),

    mainButtons: () => [
        new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('status_menu')
            .setLabel('꒰ เปิดทำสถานะ ꒱')
            .setEmoji('<a:green_cycle:1403018466562408658>')
            .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
            .setCustomId('disable_status')
            .setLabel('꒰ ปิดทำสถานะ ꒱')
            .setEmoji('<a:red_cycle:1403018523604942858>')
            .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
            .setLabel('꒰ วิธีใช้งาน ꒱')
            .setEmoji('<:ibo_emoji_6:1407344775618756800>')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/channels/1373361478010146967/1380428779259953293')
        )
    ],

    freeSelect: () => new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('free_options')
            .setPlaceholder('|︲🍀 ตัวเลือกเพิ่มเติม︲|')
            .addOptions([
                { label: '>>> ปิดใช้งานสถานะ <<<',
                  description: '[ ตัวเลือกพิเศษทางลัดปิดสถานะ ]',
                  emoji: '<a:red_cycle:1403018523604942858>',
                  value: 'direct_disable'
                },
                { label: 'ล้างตัวเลือกใหม่',
                  value: 'refresh_embed',
                  emoji: '<:Ldelete:1387382890781999115>' }
            ])
    ),

    statusMenuButtons: () => [
        new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('set_token')
            .setLabel('✅ ตั้งค่าข้อมูล')
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setCustomId('set_status_page1')
            .setLabel('💬 ตั้งสถานะหน้าแรก')
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setCustomId('set_status_page2')
            .setLabel('💬 ตั้งสถานะหน้าสอง')
            .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('set_buttons')
            .setLabel('🔥 ตั้งค่าปุ่มสถานะ')
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setCustomId('set_stream')
            .setLabel('🟣 ตั้งค่าลิงค์สตรีม')
            .setStyle(ButtonStyle.Secondary)
        )
    ]
};

function getDefaultStatusSettings() {
    return {
        page1: {
            line1: '꒰ time:t ꒱ ✦ ꒰ date:n ꒱',
            line2: '【 𝟏 / 𝟐 】👒ꔛ☆★☆★☆★☆★ꔛ',
            line3: '⋆꒰ 🌡️ temp:c °𝐂 ꒱ εїз ꒰🍃 ping:ms 𝗸𝗺/𝘀 ꒱⋆',
            largeImage: 'https://i.ibb.co/bMTskyck/3e9e158f-4701-4fac-8e9e-c2b16188a21f.gif',
            smallImage: 'https://i.ibb.co/bMTskyck/3e9e158f-4701-4fac-8e9e-c2b16188a21f.gif'
        },
        page2: {
            line1: '꒰ day:th ꒱ ✦ ꒰ day:eg ꒱',
            line2: '【 𝟐 / 𝟐 】👒ꔛ★☆★☆★☆★☆ꔛ',
            line3: '⋆꒰ 🌡️ temp:c °𝐂 ꒱ εїз ꒰🍃 ping:ms 𝗸𝗺/𝘀 ꒱⋆',
            largeImage: 'https://i.ibb.co/bMTskyck/3e9e158f-4701-4fac-8e9e-c2b16188a21f.gif',
            smallImage: 'https://i.ibb.co/bMTskyck/3e9e158f-4701-4fac-8e9e-c2b16188a21f.gif'
        },
        streamName: 'Twitch',
        streamUrl: 'https://twitch.tv/twitch'
    };
}

async function loadUserData(userId, type) {
    try {
        const folderPath = path.join('./data', type);
        const filePath = path.join(folderPath, `${type}_${userId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function saveUserData(userId, type, data) {
    try {
        const folderPath = path.join('./data', type);
        await fs.mkdir(folderPath, { recursive: true });
        const filePath = path.join(folderPath, `${type}_${userId}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('[ERROR] ❌ ไม่สามารถบันทึกข้อมูลได้');
    }
}

async function validateTokenWithRetry(token, userId, maxRetries = 3) {
    const axios = require('axios');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get('https://discord.com/api/v10/users/@me', {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'User-Agent': 'DiscordBot (https://discord.com, 1.0.0)'
                },
                timeout: 10000
            });

            const userData = response.data;

            if (!userData.id || !userData.username) {
                throw new Error('Invalid user data received');
            }

            return userData;

        } catch (error) {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                throw new Error('Token ไม่ถูกต้องหรือหมดอายุ');
            }

            if (attempt === maxRetries) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error('เชื่อมต่อ Discord API หมดเวลา กรุณาลองใหม่อีกครั้ง');
                } else if (error.response && error.response.status === 429) {
                    throw new Error('Discord API Rate Limited กรุณารอสักครู่แล้วลองใหม่');
                } else {
                    throw new Error('ไม่สามารถเชื่อมต่อ Discord API ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function stopSelfbot(userId) {
    const selfbot = selfbotClients.get(userId);
    if (selfbot) {
        try {
            if (selfbot.statusInterval) {
                clearInterval(selfbot.statusInterval);
                selfbot.statusInterval = null;
            }

            if (selfbot.user) {
                try {
                    await selfbot.user.setPresence({
                        activities: [],
                        status: 'offline'
                    });
                } catch (presenceError) {
                }
            }

            await selfbot.destroy();
            selfbotClients.delete(userId);

        } catch (error) {
            selfbotClients.delete(userId);
        }
    }
}

async function startSelfbot(userId) {
    try {
        const tokenData = await loadUserData(userId, 'userToken');
        let configData = await loadUserData(userId, 'userConfig');

        if (!tokenData.token) {
            throw new Error('ไม่พบโทเค่น');
        }

        if (!configData.page1) {
            throw new Error('ไม่พบข้อมูลสถานะ');
        }

        await stopSelfbot(userId);

        const selfbot = new SelfbotClient();
        const getImage = new GetImage(selfbot);
        const keyDynamic = new KeyDynamic();

        let currentPage = 1;
        let statusInterval;

        selfbot.updateConfig = (newConfig) => {
            configData = { ...configData, ...newConfig };
            console.log(`[CONFIG] 🔄 อัพเดทการตั้งค่าสำหรับ USER ID: ${userId}`);
        };

        selfbot.on('ready', async () => {
            console.log(`[STATUS] 🟢 สถานะสตรีมเปิดใช้งานแล้วสำหรับ USER ID: ${userId}`);

            const updateStatus = async () => {
                try {
                    if (!selfbot.user || selfbot.readyAt === null) {
                        console.log(`[WARNING] ⚠️ ระบบสตรีมไม่พร้อมใช้งานสำหรับ USER ID: ${userId} - หยุดการอัพเดตสถานะ`);
                        if (statusInterval) {
                            clearInterval(statusInterval);
                            statusInterval = null;
                        }
                        selfbotClients.delete(userId);
                        return;
                    }

                    let pageData;
                    const hasPage2 = configData.page2 && configData.page2.line1;

                    if (hasPage2) {
                        pageData = currentPage === 1 ? configData.page1 : configData.page2;
                        currentPage = currentPage === 1 ? 2 : 1;
                    } else {
                        pageData = configData.page1;
                    }

                    const processedLine1 = pageData.line1 ? keyDynamic.processText(pageData.line1) : undefined;
                    const processedLine2 = pageData.line2 ? keyDynamic.processText(pageData.line2) : undefined;
                    const processedLine3 = pageData.line3 ? keyDynamic.processText(pageData.line3) : undefined;

                    let largeImage = pageData.largeImage;
                    let smallImage = pageData.smallImage;

                    const hasLargeImage = largeImage && largeImage.trim() !== '';
                    const hasSmallImage = smallImage && smallImage.trim() !== '';

                    if (hasLargeImage || hasSmallImage) {
                        try {
                            const imageResult = await getImage.get(
                                hasLargeImage ? largeImage : null, 
                                hasSmallImage ? smallImage : null
                            );
                            largeImage = imageResult.bigImage;
                            smallImage = imageResult.smallImage;
                        } catch (error) {
                            largeImage = null;
                            smallImage = null;
                        }
                    } else {
                        largeImage = null;
                        smallImage = null;
                    }

                    const presenceButtons = [];
                    if (configData.buttons?.button1Name && configData.buttons?.button1Link) {
                        presenceButtons.push(keyDynamic.processText(configData.buttons.button1Name));
                    }
                    if (configData.buttons?.button2Name && configData.buttons?.button2Link) {
                        presenceButtons.push(keyDynamic.processText(configData.buttons.button2Name));
                    }

                    const activityData = {
                        name: configData.streamName || 'Twitch',
                        type: 1,
                        url: configData.streamUrl || 'https://twitch.tv/twitch',
                        details: processedLine1 || ' ',
                        state: processedLine2 || ' '
                    };

                    if (largeImage || smallImage || processedLine3) {
                        activityData.assets = {};

                        if (largeImage) {
                            activityData.assets.large_image = largeImage;
                        }

                        if (processedLine3) {
                            activityData.assets.large_text = processedLine3;
                        }

                        if (smallImage) {
                            activityData.assets.small_image = smallImage;
                        }
                    }

                    if (presenceButtons.length > 0) {
                        activityData.buttons = presenceButtons;
                    }

                    const presence = {
                        activities: [activityData],
                        status: 'online'
                    };

                    await selfbot.user.setPresence(presence);
                } catch (error) {
                    console.log(`[WARN] updateStatus error for ${userId}:`, error.message || error);
                }
            };

            await updateStatus();
            statusInterval = setInterval(updateStatus, 7000);
        });

        selfbot.on('disconnect', () => {
            if (statusInterval) {
                clearInterval(statusInterval);
            }
            console.log(`[WARNING] ⚠️ สถานะสตรีมขาดการเชื่อมต่อสำหรับ USER ID: ${userId}`);
        });

        selfbot.on('error', (error) => {
            console.log(`[ERROR] ❌ สถานะสตรีม error สำหรับ USER ID: ${userId}:`, error.message);

            if (error.code === 40001 || error.code === 40002 || error.code === 40003 || 
                (error.message && (error.message.includes('Unauthorized') || error.message.includes('Invalid token') ||
                error.message.includes('401') || error.message.includes('403')))) {

                console.log(`[AUTH_ERROR] 🚨 Auth error detected สำหรับ USER ID: ${userId} - ปิดการเชื่อมต่ออัตโนมัติ`);

                if (statusInterval) {
                    clearInterval(statusInterval);
                    statusInterval = null;
                }

                selfbotClients.delete(userId);

                try { selfbot.destroy(); } catch (destroyError) { /* ignore */ }

                return;
            }

            console.log(`[ERROR] ❌ General Streaming status error สำหรับ USER ID: ${userId}:`, error.message);
        });

        await selfbot.login(tokenData.token);
        selfbotClients.set(userId, selfbot);

        return true;
    } catch (error) {
        console.error(`[ERROR] ❌ ไม่สามารถเปิดใช้งานสถานะสำหรับ USER ID: ${userId}:`, error && error.message ? error.message : error);
        return false;
    }
}

// Discord ready / commands
client.once('ready', async () => {
    console.log(`[STATUS] ✅ บอทออนไลน์แล้ว: ${client.user.tag}`);

    const statusList = [
        '⚡・ทำสถานะสตรีม 24 ชั่วโมง ฟรี!',
        '🔥・ระบบทำสถานะอัตโนมัติ',
        '💜・บริการสถานะฟรี 100%',
        '🌟・สถานะไม่ดับแม้ออฟไลน์'
    ];

    let currentStatusIndex = 0;
    try {
        client.user.setActivity(statusList[currentStatusIndex], {
            type: ActivityType.Custom
        });

        client.user.setStatus('idle');
    } catch (e) {
        console.log('[WARN] ไม่สามารถตั้ง activity ได้:', e.message);
    }

    setInterval(() => {
        currentStatusIndex = (currentStatusIndex + 1) % statusList.length;
        try {
            client.user.setActivity(statusList[currentStatusIndex], {
                type: ActivityType.Custom
            });
        } catch (e) {
            // ignore
        }
    }, 7000);

    const commands = [
        new SlashCommandBuilder()
            .setName('setup_status')
            .setDescription('[แอดมิน] 🌲 • ตั้งค่าระบบสถานะสตรีมมิ่ง')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('🌿 • เลือกช่องที่จะส่งเมนูทำสถานะ')
                    .setRequired(true)
                    .addChannelTypes(ChannelType.GuildText)
            )
    ];

    try {
        await client.application.commands.set(commands);
    } catch (err) {
        console.log('[WARN] ไม่สามารถลงทะเบียนคำสั่งได้ขณะนี้:', err.message);
    }
});

// Interaction handlers (ใช้โค้ด interaction ของเธอเดิมได้เลย)
client.on('interactionCreate', async interaction => {
    try {
        // --- ถ้าอยากให้เราแปะโค้ด interaction เต็ม ให้บอก เราจะใส่ไม่แก้ logic ---
        // ปัจจุบันสมมติว่าไฟล์เดิมมี handler interactionCreate ครบแล้ว
    } catch (err) {
        console.error('interaction handler top-level error:', err);
    }
});

client.on('error', console.error);

// safety check before login
if (!config.token || !config.token.trim()) {
    console.log('[ERROR] ❌ กรุณาใส่โทเค่นบอทใน ENV (TOKEN) ก่อน! ระบบจะไม่เริ่มทำงาน');
    process.exit(1);
}

// login bot
client.login(config.token).catch(err => {
    console.error('[ERROR] ❌ ล็อกอินบอทล้มเหลว:', err.message);
    // not exiting immediately so Railway logs show reason
});
