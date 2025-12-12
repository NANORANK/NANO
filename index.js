// index.js (Railway-ready, health endpoint, improved interaction handling)
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
// Express health server (Railway checks)
const app = express();
app.get('/', (req, res) => res.send('xSwift Status Bot — alive'));
app.get('/healthz', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

const port = Number(config.port || process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`🚀 Health server listening on port ${port}`);
});
// ---------------------

// ---------------------
// Discord client (bot account)
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

// --- UI / helpers (เหมือนเดิมของโปรเจค) ---
const UI = {
  mainEmbed: () => new EmbedBuilder()
    .setTitle('``꒰🍀꒱`` บริการทำสถานะอัตโนมัติ (ฟรี)')
    .setDescription(
      '**``꒰🌿꒱`` ทำสถานะสตรีมมิ่งที่หน้าโปรไฟล์ผ่านบอท\n' +
      '``꒰☘️꒱`` ระบบทำสถานะอัตโนมัติ 24 ชั่วโมง ฟรี!\n' +
      '``꒰🌲꒱`` สถานะจะออนตลอดไม่ดับถึงแม้ว่าจะออฟไลน์\n' +
      '``꒰🌴꒱`` ตั้งค่าชื่อสถานะได้ตามใจ ประทับใจแน่นอน**'
    )
    .setImage('https://cdn.discordapp.com/attachments/1373550875435470869/1403150070483783844/20250808_055344_0000.png'),
  mainButtons: () => [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('status_menu').setLabel('꒰ เปิดทำสถานะ ꒱').setEmoji('<a:green_cycle:1403018466562408658>').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('disable_status').setLabel('꒰ ปิดทำสถานะ ꒱').setEmoji('<a:red_cycle:1403018523604942858>').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setLabel('꒰ วิธีใช้งาน ꒱').setEmoji('<:ibo_emoji_6:1407344775618756800>').setStyle(ButtonStyle.Link).setURL('https://discord.com/channels/1373361478010146967/1380428779259953293')
      )
  ],
  freeSelect: () => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('free_options')
      .setPlaceholder('|︲🍀 ตัวเลือกเพิ่มเติม︲|')
      .addOptions([
        {
          label: '>>> ปิดใช้งานสถานะ <<<',
          description: '[ ตัวเลือกพิเศษทางลัดปิดสถานะ ]',
          emoji: '<a:red_cycle:1403018523604942858>',
          value: 'direct_disable'
        },
        { label: 'ล้างตัวเลือกใหม่', value: 'refresh_embed', emoji: '<:Ldelete:1387382890781999115>' }
      ])
  ),
  statusMenuButtons: () => [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('set_token').setLabel('✅ ตั้งค่าข้อมูล').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_status_page1').setLabel('💬 ตั้งสถานะหน้าแรก').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_status_page2').setLabel('💬 ตั้งสถานะหน้าสอง').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('set_buttons').setLabel('🔥 ตั้งค่าปุ่มสถานะ').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('set_stream').setLabel('🟣 ตั้งค่าลิงค์สตรีม').setStyle(ButtonStyle.Secondary)
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
    console.error('[ERROR] ❌ ไม่สามารถบันทึกข้อมูลได้', error);
  }
}

async function validateTokenWithRetry(token, userId, maxRetries = 3) {
  const axios = require('axios');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get('https://discord.com/api/v10/users/@me', {
        headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': 'DiscordBot (https://discord.com, 1.0.0)' },
        timeout: 10000
      });
      const userData = response.data;
      if (!userData.id || !userData.username) throw new Error('Invalid user data received');
      return userData;
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) throw new Error('Token ไม่ถูกต้องหรือหมดอายุ');
      if (attempt === maxRetries) {
        if (error.code === 'ECONNABORTED') throw new Error('เชื่อมต่อ Discord API หมดเวลา กรุณาลองใหม่อีกครั้ง');
        else if (error.response && error.response.status === 429) throw new Error('Discord API Rate Limited กรุณารอสักครู่แล้วลองใหม่');
        else throw new Error('ไม่สามารถเชื่อมต่อ Discord API ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function stopSelfbot(userId) {
  const selfbot = selfbotClients.get(userId);
  if (selfbot) {
    try {
      if (selfbot.statusInterval) { clearInterval(selfbot.statusInterval); selfbot.statusInterval = null; }
      if (selfbot.user) {
        try { await selfbot.user.setPresence({ activities: [], status: 'offline' }); } catch (e) {}
      }
      await selfbot.destroy();
      selfbotClients.delete(userId);
    } catch (error) { selfbotClients.delete(userId); }
  }
}

async function startSelfbot(userId) {
  try {
    const tokenData = await loadUserData(userId, 'userToken');
    let configData = await loadUserData(userId, 'userConfig');
    if (!tokenData.token) throw new Error('ไม่พบโทเค่น');
    if (!configData.page1) throw new Error('ไม่พบข้อมูลสถานะ');
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
            if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
            selfbotClients.delete(userId);
            return;
          }

          let pageData;
          const hasPage2 = configData.page2 && configData.page2.line1;
          if (hasPage2) {
            pageData = currentPage === 1 ? configData.page1 : configData.page2;
            currentPage = currentPage === 1 ? 2 : 1;
          } else pageData = configData.page1;

          const processedLine1 = pageData.line1 ? keyDynamic.processText(pageData.line1) : undefined;
          const processedLine2 = pageData.line2 ? keyDynamic.processText(pageData.line2) : undefined;
          const processedLine3 = pageData.line3 ? keyDynamic.processText(pageData.line3) : undefined;

          let largeImage = pageData.largeImage;
          let smallImage = pageData.smallImage;
          const hasLargeImage = largeImage && largeImage.trim() !== '';
          const hasSmallImage = smallImage && smallImage.trim() !== '';

          if (hasLargeImage || hasSmallImage) {
            try {
              const imageResult = await getImage.get(hasLargeImage ? largeImage : null, hasSmallImage ? smallImage : null);
              largeImage = imageResult.bigImage;
              smallImage = imageResult.smallImage;
            } catch (error) { largeImage = null; smallImage = null; }
          } else { largeImage = null; smallImage = null; }

          const presenceButtons = [];
          if (configData.buttons?.button1Name && configData.buttons?.button1Link) presenceButtons.push(keyDynamic.processText(configData.buttons.button1Name));
          if (configData.buttons?.button2Name && configData.buttons?.button2Link) presenceButtons.push(keyDynamic.processText(configData.buttons.button2Name));

          const activityData = {
            name: configData.streamName || 'Twitch',
            type: 1,
            url: configData.streamUrl || 'https://twitch.tv/twitch',
            details: processedLine1 || ' ',
            state: processedLine2 || ' '
          };

          if (largeImage || smallImage || processedLine3) {
            activityData.assets = {};
            if (largeImage) activityData.assets.large_image = largeImage;
            if (processedLine3) activityData.assets.large_text = processedLine3;
            if (smallImage) activityData.assets.small_image = smallImage;
          }

          if (presenceButtons.length > 0) activityData.buttons = presenceButtons;

          const presence = { activities: [activityData], status: 'online' };
          await selfbot.user.setPresence(presence);
        } catch (error) {
          console.log('[ERROR] updateStatus selfbot:', error && error.message ? error.message : error);
        }
      };

      await updateStatus();
      statusInterval = setInterval(updateStatus, 7000);
    });

    selfbot.on('disconnect', () => {
      if (statusInterval) { clearInterval(statusInterval); }
      console.log(`[WARNING] ⚠️ สถานะสตรีมขาดการเชื่อมต่อสำหรับ USER ID: ${userId}`);
    });

    selfbot.on('error', (error) => {
      console.log(`[ERROR] ❌ สถานะสตรีม error สำหรับ USER ID: ${userId}:`, error && error.message ? error.message : error);
      if (error && (error.code === 40001 || error.code === 40002 || error.code === 40003 ||
        (error.message && (error.message.includes('Unauthorized') || error.message.includes('Invalid token') || error.message.includes('401') || error.message.includes('403'))))) {
        if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
        selfbotClients.delete(userId);
        try { selfbot.destroy(); } catch (e) {}
        return;
      }
    });

    await selfbot.login(tokenData.token);
    selfbotClients.set(userId, selfbot);
    return true;
  } catch (error) {
    console.error(`[ERROR] ❌ ไม่สามารถเปิดใช้งานสถานะสำหรับ USER ID: ${userId}`, error && error.message ? error.message : error);
    return false;
  }
}

// ---------- Ready + register commands ----------
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
    client.user.setActivity(statusList[currentStatusIndex], { type: ActivityType.Custom });
    client.user.setStatus('idle');
  } catch (e) { console.log('[WARN] ไม่สามารถตั้ง activity ได้:', e.message); }

  setInterval(() => {
    currentStatusIndex = (currentStatusIndex + 1) % statusList.length;
    try { client.user.setActivity(statusList[currentStatusIndex], { type: ActivityType.Custom }); } catch (e) {}
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
      .toJSON()
  ];

  try {
    await client.application.commands.set(commands);
    console.log('[INFO] registered application commands');
  } catch (err) {
    console.log('[WARN] ไม่สามารถลงทะเบียนคำสั่งได้ขณะนี้:', err && err.message ? err.message : err);
  }
});

// ---------- Interaction handler (แก้ปัญหา "แอปไม่ตอบ") ----------
client.on('interactionCreate', async (interaction) => {
  try {
    // Slash command: /setup_status
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup_status') {
        // defer immediately to avoid "app not responding"
        await interaction.deferReply({ ephemeral: true });

        // admin check: config.adminIds should be array from ENV ADMIN_IDS
        const adminIds = Array.isArray(config.adminIds) ? config.adminIds : [];
        if (!adminIds.includes(interaction.user.id)) {
          await interaction.editReply({ content: '❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้', ephemeral: true });
          return;
        }

        const channel = interaction.options.getChannel('channel');
        if (!channel || !channel.isTextBased()) {
          await interaction.editReply({ content: '❌ โปรดเลือกห้องข้อความที่ถูกต้อง', ephemeral: true });
          return;
        }

        const embed = UI.mainEmbed();
        const buttons = UI.mainButtons();
        const selectMenu = UI.freeSelect();

        // try to send panel into the chosen channel
        try {
          await channel.send({ embeds: [embed], components: [selectMenu, ...buttons] });
        } catch (sendErr) {
          console.error('[ERROR] send panel failed:', sendErr);
          await interaction.editReply({ content: '❌ ส่ง Panel ไม่สำเร็จ (ตรวจสอบสิทธิ์บอทในช่องนั้น)', ephemeral: true });
          return;
        }

        await interaction.editReply({ content: `✅ ส่งแผงเมนูทำสถานะเรียบร้อยที่ ${channel}`, ephemeral: true });
        return;
      }
    }

    // Buttons
    if (interaction.isButton()) {
      // handle main UI buttons quickly (status_menu, disable_status, set_token, etc.)
      const { customId, user } = interaction;

      if (customId === 'status_menu') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle("``⚙️`` ตั้งค่าสตรีมมิ่งบนโปรไฟล์")
          .addFields(
            { name: "``✅`` ตั้งข้อมูล", value: "**```ใส่โทเค่นเพื่อเริ่มใช้งาน```**", inline: true },
            { name: "``💬`` ชื่อสถานะ", value: "**```ข้อความสลับหน้า```**", inline: true },
            { name: "``📖`` เพิ่มรูปภาพ", value: "**```รูปภาพสลับหน้า```**", inline: true },
            { name: "``🔥`` ตั้งค่าปุ่มสตรีม", value: "**```ชื่อปุ่มและลิงก์```**", inline: true },
            { name: "``🟣`` ตั้งลิงค์สตรีม", value: "**```URL การสตรีม```**", inline: true },
            { name: "``🏩`` คู่มือทำสถานะ", value: "**```สถานะแสดงผล```**", inline: true }
          ).setColor("#FFD700");
        const components = UI.statusMenuButtons();
        await interaction.editReply({ embeds: [embed], components, ephemeral: true });
        return;
      }

      if (customId === 'disable_status') {
        await interaction.deferReply({ ephemeral: true });
        const selfbot = selfbotClients.get(user.id);
        if (!selfbot) {
          const notEnable = new EmbedBuilder().setTitle('``꒰❌꒱`` คุณยังไม่ได้เปิดใช้งานสถานะ').setColor(FAILED);
          await interaction.editReply({ embeds: [notEnable] });
          return;
        }
        await stopSelfbot(user.id);
        const disabled = new EmbedBuilder().setTitle('``꒰✅꒱`` ปิดการใช้งานสถานะแล้ว').setColor(SUCCESS);
        await interaction.editReply({ embeds: [disabled] });
        console.log(`[STATUS] 🔴 สถานะสตรีมปิดใช้งานแล้วสำหรับ USER ID: ${user.id}`);
        return;
      }

      // The rest of button handlers (set_token, set_status_page1, set_buttons, set_stream, etc.)
      // will rely on modal handling below. For brevity, defer + show modal as appropriate.
      if (customId === 'set_token') {
        const modal = new ModalBuilder().setCustomId('token_modal').setTitle('ตั้งค่าโทเค่น');
        const tokenInput = new TextInputBuilder().setCustomId('token_input').setLabel('โทเค่นผู้ใช้งาน').setStyle(TextInputStyle.Short).setPlaceholder('TOKEN ควรเก็บเป็นความลับรู้เพียงคุณเท่านั้น').setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(tokenInput));
        await interaction.showModal(modal);
        return;
      }

      if (customId === 'set_status_page1' || customId === 'set_status_page2') {
        const isPage1 = customId === 'set_status_page1';
        const modal = new ModalBuilder().setCustomId(isPage1 ? 'status_page1_modal' : 'status_page2_modal').setTitle(isPage1 ? 'ตั้งสถานะหน้าแรก' : 'ตั้งสถานะหน้าสอง');

        const configData = await loadUserData(user.id, 'userConfig');
        const pageData = isPage1 ? (configData.page1 || {}) : (configData.page2 || {});
        const defaults = getDefaultStatusSettings()[isPage1 ? 'page1' : 'page2'];

        const line1 = new TextInputBuilder().setCustomId('line1').setLabel('บรรทัดแรก').setStyle(TextInputStyle.Short).setPlaceholder('-').setValue(pageData.line1 || defaults.line1).setRequired(false);
        const line2 = new TextInputBuilder().setCustomId('line2').setLabel('บรรทัดสอง').setStyle(TextInputStyle.Short).setPlaceholder('-').setValue(pageData.line2 || defaults.line2).setRequired(false);
        const line3 = new TextInputBuilder().setCustomId('line3').setLabel('บรรทัดสาม').setStyle(TextInputStyle.Short).setPlaceholder('-').setValue(pageData.line3 || defaults.line3).setRequired(false);
        const largeImage = new TextInputBuilder().setCustomId('large_image').setLabel('ภาพใหญ่').setStyle(TextInputStyle.Short).setPlaceholder('-').setValue(pageData.largeImage || defaults.largeImage).setRequired(false);
        const smallImage = new TextInputBuilder().setCustomId('small_image').setLabel('ภาพเล็ก').setStyle(TextInputStyle.Short).setPlaceholder('-').setValue(pageData.smallImage || defaults.smallImage).setRequired(false);

        modal.addComponents(new ActionRowBuilder().addComponents(line1), new ActionRowBuilder().addComponents(line2), new ActionRowBuilder().addComponents(line3), new ActionRowBuilder().addComponents(largeImage), new ActionRowBuilder().addComponents(smallImage));
        await interaction.showModal(modal);
        return;
      }

      if (customId === 'set_buttons') {
        const modal = new ModalBuilder().setCustomId('buttons_modal').setTitle('ตั้งค่าปุ่มกดสถานะ');
        const configData = await loadUserData(user.id, 'userConfig');
        const buttons = configData.buttons || {};
        const button1Name = new TextInputBuilder().setCustomId('button1_name').setLabel('ชื่อปุ่ม 1').setStyle(TextInputStyle.Short).setPlaceholder('ชื่อปุ่มแรก').setValue(buttons.button1Name || '').setRequired(false);
        const button1Link = new TextInputBuilder().setCustomId('button1_link').setLabel('ลิงค์ปุ่ม 1').setStyle(TextInputStyle.Short).setPlaceholder('https://example.com').setValue(buttons.button1Link || '').setRequired(false);
        const button2Name = new TextInputBuilder().setCustomId('button2_name').setLabel('ชื่อปุ่ม 2').setStyle(TextInputStyle.Short).setPlaceholder('ชื่อปุ่มสอง').setValue(buttons.button2Name || '').setRequired(false);
        const button2Link = new TextInputBuilder().setCustomId('button2_link').setLabel('ลิงค์ปุ่ม 2').setStyle(TextInputStyle.Short).setPlaceholder('https://example.com').setValue(buttons.button2Link || '').setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(button1Name), new ActionRowBuilder().addComponents(button1Link), new ActionRowBuilder().addComponents(button2Name), new ActionRowBuilder().addComponents(button2Link));
        await interaction.showModal(modal);
        return;
      }

      if (customId === 'set_stream') {
        const modal = new ModalBuilder().setCustomId('stream_modal').setTitle('ตั้งค่าลิงค์สตรีม');
        const configData = await loadUserData(user.id, 'userConfig');
        const streamName = new TextInputBuilder().setCustomId('stream_name').setLabel('ชื่อสตรีม').setStyle(TextInputStyle.Short).setPlaceholder('ชื่อสตรีมของคุณ').setValue(configData.streamName || 'Twitch').setRequired(false);
        const streamUrl = new TextInputBuilder().setCustomId('stream_url').setLabel('URL สตรีม').setStyle(TextInputStyle.Short).setPlaceholder('https://twitch.tv/username').setValue(configData.streamUrl || 'https://twitch.tv/twitch').setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(streamName), new ActionRowBuilder().addComponents(streamUrl));
        await interaction.showModal(modal);
        return;
      }
    }

    // Select menu
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'free_options') {
        const selectedOption = interaction.values[0];
        if (selectedOption === 'refresh_embed') {
          await interaction.deferUpdate();
          const embed = UI.mainEmbed();
          const buttons = UI.mainButtons();
          const selectMenu = UI.freeSelect();
          await interaction.editReply ? interaction.editReply({ embeds: [embed], components: [selectMenu, ...buttons] }) : null;
          return;
        }
        if (selectedOption === 'direct_disable') {
          const modal = new ModalBuilder().setCustomId('direct_disable_modal').setTitle('หากปิดสถานะไม่ได้');
          const tokenInput = new TextInputBuilder().setCustomId('disable_token_input').setLabel('โทเค่นผู้ใช้งาน').setStyle(TextInputStyle.Short).setPlaceholder('TOKEN ควรเก็บเป็นความลับ').setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(tokenInput));
          await interaction.showModal(modal);
          return;
        }
      }
    }

    // Modals
    if (interaction.isModalSubmit()) {
      const { customId, user } = interaction;
      if (customId === 'token_modal') {
        const token = interaction.fields.getTextInputValue('token_input').trim();
        await interaction.deferReply({ ephemeral: true });
        if (!token.includes('.') || token.length < 50) {
          const invalidToken = new EmbedBuilder().setTitle('``꒰❌꒱`` รูปแบบโทเค่นไม่ถูกต้อง').setColor(FAILED);
          await interaction.editReply({ embeds: [invalidToken] });
          return;
        }
        try {
          const userData = await validateTokenWithRetry(token, user.id);
          await saveUserData(user.id, 'userToken', { token });
          let configData = await loadUserData(user.id, 'userConfig');
          if (!configData.page1) {
            const defaultSettings = getDefaultStatusSettings();
            configData.page1 = defaultSettings.page1;
            configData.page2 = defaultSettings.page2;
            if (!configData.streamName) configData.streamName = defaultSettings.streamName;
            if (!configData.streamUrl) configData.streamUrl = defaultSettings.streamUrl;
            await saveUserData(user.id, 'userConfig', configData);
          }
          const existingSelfbot = selfbotClients.get(user.id);
          if (!existingSelfbot) {
            const success = await startSelfbot(user.id);
            if (success) {
              const saved = new EmbedBuilder().setTitle('``꒰✅꒱`` เริ่มใช้งานสถานะเรียบร้อยแล้ว').setDescription('**```สถานะจะอัพเดทอัตโนมัติตามการตั้งค่าของคุณ```**').setThumbnail(interaction.user.displayAvatarURL({ dynamic: true})).setColor(SUCCESS);
              await interaction.editReply({ embeds: [saved] });
              console.log(`[LOG] 🔑 ผู้ใช้: ${user.id} บันทึกโทเค่นและเริ่มสถานะสำเร็จ`);
            } else {
              const saved = new EmbedBuilder().setTitle('``꒰✅꒱`` บันทึกโทเค่นเรียบร้อยแล้ว').setDescription('**```แต่ไม่สามารถเริ่มสถานะได้ กรุณาลองใหม่```**').setThumbnail(interaction.user.displayAvatarURL({ dynamic: true})).setColor(WARNING);
              await interaction.editReply({ embeds: [saved] });
              console.log(`[LOG] 🔑 ผู้ใช้: ${user.id} บันทึกโทเค่นสำเร็จ แต่เริ่มสถานะไม่ได้`);
            }
          } else {
            const saved = new EmbedBuilder().setTitle('``꒰✅꒱`` อัพเดทโทเค่นเรียบร้อยแล้ว').setDescription('**```สถานะจะอัพเดทด้วยโทเค่นใหม่```**').setThumbnail(interaction.user.displayAvatarURL({ dynamic: true})).setColor(SUCCESS);
            await interaction.editReply({ embeds: [saved] });
            console.log(`[LOG] 🔑 ผู้ใช้: ${user.id} อัพเดทโทเค่นเรียบร้อยแล้ว`);
          }
        } catch (error) {
          const invalidToken = new EmbedBuilder().setTitle('``꒰❌꒱`` โทเค่นไม่ถูกต้อง').setDescription(`**\`\`\`${error.message}\`\`\`**`).setThumbnail(interaction.user.displayAvatarURL({ dynamic: true })).setColor(FAILED);
          await interaction.editReply({ embeds: [invalidToken] });
        }
        return;
      }

      // status page modals (page1/page2)
      if (customId === 'status_page1_modal' || customId === 'status_page2_modal') {
        const isPage1 = customId === 'status_page1_modal';
        const configData = await loadUserData(user.id, 'userConfig');
        const pageKey = isPage1 ? 'page1' : 'page2';
        configData[pageKey] = {
          line1: interaction.fields.getTextInputValue('line1'),
          line2: interaction.fields.getTextInputValue('line2') || '',
          line3: interaction.fields.getTextInputValue('line3') || '',
          largeImage: interaction.fields.getTextInputValue('large_image') || '',
          smallImage: interaction.fields.getTextInputValue('small_image') || ''
        };
        await saveUserData(user.id, 'userConfig', configData);
        const existingSelfbot = selfbotClients.get(user.id);
        if (existingSelfbot && existingSelfbot.updateConfig) existingSelfbot.updateConfig(configData);
        const saved = new EmbedBuilder().setTitle(isPage1 ? '``꒰✅꒱`` บันทึกสถานะหน้าแรกแล้ว' : '``꒰✅꒱`` บันทึกสถานะหน้าสองแล้ว').setDescription('**```ข้อมูลสถานะถูกบันทึกเรียบร้อยแล้ว```**').setThumbnail(interaction.user.displayAvatarURL({ dynamic: true})).setColor(SUCCESS);
        await interaction.reply({ embeds: [saved], ephemeral: true });
        return;
      }

      if (customId === 'buttons_modal') {
        const configData = await loadUserData(user.id, 'userConfig');
        configData.buttons = {
          button1Name: interaction.fields.getTextInputValue('button1_name') || '',
          button1Link: interaction.fields.getTextInputValue('button1_link') || '',
          button2Name: interaction.fields.getTextInputValue('button2_name') || '',
          button2Link: interaction.fields.getTextInputValue('button2_link') || ''
        };
        await saveUserData(user.id, 'userConfig', configData);
        const existingSelfbot = selfbotClients.get(user.id);
        if (existingSelfbot && existingSelfbot.updateConfig) existingSelfbot.updateConfig(configData);
        const saved = new EmbedBuilder().setTitle('``꒰✅꒱`` บันทึกการตั้งค่าปุ่มแล้ว').setDescription('**```ข้อมูลสถานะถูกบันทึกเรียบร้อยแล้ว```**').setThumbnail(interaction.user.displayAvatarURL({ dynamic: true})).setColor(SUCCESS);
        await interaction.reply({ embeds: [saved], ephemeral: true });
        return;
      }

      if (customId === 'stream_modal') {
        const configData = await loadUserData(user.id, 'userConfig');
        configData.streamName = interaction.fields.getTextInputValue('stream_name');
        configData.streamUrl = interaction.fields.getTextInputValue('stream_url');
        await saveUserData(user.id, 'userConfig', configData);
        const existingSelfbot = selfbotClients.get(user.id);
        if (existingSelfbot && existingSelfbot.updateConfig) existingSelfbot.updateConfig(configData);
        const saved = new EmbedBuilder().setTitle('``꒰✅꒱`` บันทึกการตั้งค่าสตรีมแล้ว').setDescription('**```ข้อมูลสถานะถูกบันทึกเรียบร้อยแล้ว```**').setThumbnail(interaction.user.displayAvatarURL({ dynamic: true})).setColor(SUCCESS);
        await interaction.reply({ embeds: [saved], ephemeral: true });
        return;
      }

      if (customId === 'direct_disable_modal') {
        const token = interaction.fields.getTextInputValue('disable_token_input').trim();
        await interaction.deferReply({ ephemeral: true });
        if (!token.includes('.') || token.length < 50) {
          const invalidToken = new EmbedBuilder().setTitle('``꒰❌꒱`` รูปแบบโทเค่นไม่ถูกต้อง').setColor(FAILED);
          return interaction.editReply({ embeds: [invalidToken] });
        }
        try {
          const userData = await validateTokenWithRetry(token, user.id);
          const existingSelfbot = selfbotClients.get(user.id);
          if (!existingSelfbot) {
            const notRunning = new EmbedBuilder().setTitle('``꒰❌꒱`` คุณไม่ได้เปิดใช้งานสถานะอยู่').setColor(FAILED);
            return interaction.editReply({ embeds: [notRunning] });
          }
          await stopSelfbot(user.id);
          const success = new EmbedBuilder().setTitle('``꒰✅꒱`` ปิดใช้งานสถานะโดยตรงสำเร็จ').setColor(SUCCESS);
          await interaction.editReply({ embeds: [success] });
          console.log(`[STATUS] 🔴 สถานะสตรีมปิดใช้งานโดยตรงสำเร็จ สำหรับ USER ID: ${user.id}`);
        } catch (error) {
          const invalidToken = new EmbedBuilder().setTitle('``꒰❌꒱`` โทเค่นไม่ถูกต้อง').setDescription(`**\`\`\`${error.message}\`\`\`**`).setColor(FAILED);
          await interaction.editReply({ embeds: [invalidToken] });
        }
        return;
      }
    }
  } catch (err) {
    console.error('[ERROR] interaction handler:', err);
    try {
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}`, ephemeral: true });
      else if (interaction.deferred) await interaction.editReply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}` });
    } catch (e) { console.error('[ERROR] cannot notify user about error:', e); }
  }
});

// ---------- Other safety/error handlers ----------
client.on('error', (e) => console.error('[CLIENT ERROR]', e));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));
process.on('unhandledRejection', (reason, p) => console.error('[unhandledRejection]', reason));

// ---------- Pre-login checks ----------
if (!config.token || !config.token.trim()) {
  console.log('[ERROR] ❌ กรุณาใส่โทเค่นบอทใน ENV (TOKEN) ก่อน! ระบบจะไม่เริ่มทำงาน');
  process.exit(1);
}

// login bot
client.login(config.token).catch(err => {
  console.error('[ERROR] ❌ ล็อกอินบอทล้มเหลว:', err && err.message ? err.message : err);
});
