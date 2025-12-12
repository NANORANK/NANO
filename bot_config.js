// bot_config.js
module.exports = {
  // โทเค่นบอท (ใส่ใน Railway as SECRET: TOKEN)
  token: process.env.TOKEN || "",

  // รายชื่อ user id ที่เป็น admin ใช้คำสั่ง (ใส่ใน Railway เป็น CSV เช่น "123,456,789")
  adminIds: process.env.ADMIN_IDS && process.env.ADMIN_IDS.length
    ? process.env.ADMIN_IDS.split(",").map(s => s.trim()).filter(Boolean)
    : [],

  // Optional: port สำหรับ health check (Railway จะเซ็ตให้)
  port: process.env.PORT || 3000
};
