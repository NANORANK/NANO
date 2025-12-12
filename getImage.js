const { RichPresence } = require('discord.js-selfbot-v13');

// คลาสสำหรับจัดการรูปภาพจากลิงค์ภายนอก
class GetImage {
  constructor(client) {
    this.client = client;
  }

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async get(url1, url2) {
    try {
      const cleanUrl1 = url1 && url1.trim() !== '' ? url1.trim() : null;
      const cleanUrl2 = url2 && url2.trim() !== '' ? url2.trim() : null;
      
      const validUrl1 = cleanUrl1 && this.isValidURL(cleanUrl1) ? cleanUrl1 : null;
      const validUrl2 = cleanUrl2 && this.isValidURL(cleanUrl2) ? cleanUrl2 : null;
      
      if (!validUrl1 && !validUrl2) {
        return { bigImage: null, smallImage: null };
      }

      const { getExternal } = RichPresence;
      let images = [];

      if (validUrl1 && validUrl2) {
        images = await getExternal(this.client, "1403486230158774284", validUrl1, validUrl2);
      }
      else if (validUrl1) {
        images = await getExternal(this.client, "1403486230158774284", validUrl1);
      } else if (validUrl2) {
        images = await getExternal(this.client, "1403486230158774284", validUrl2);
      }

      let bigImage = null, smallImage = null;

      if (images && images.length >= 1) {
        images.forEach(img => {
          if (img && img.external_asset_path) {
            const { url, external_asset_path } = img;
            const fixedUrl = url && url.includes("attachments") ? url : external_asset_path;

            if (url === validUrl1) bigImage = fixedUrl;
            if (url === validUrl2) smallImage = fixedUrl;
          }
        });
      }

      return { bigImage, smallImage };
      
    } catch (error) {
      return { bigImage: null, smallImage: null };
    }
  }
}

module.exports = GetImage;