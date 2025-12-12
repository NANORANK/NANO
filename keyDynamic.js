const os = require('os');

class KeyDynamic {
    constructor() {
        this.keys = {
            'time:t': () => this.getFullWidthTime(),
            'date:n': () => this.getNumericDate(),
            'date:th': () => this.getThaiDate(),
            'date:eg': () => this.getEnglishDate(),
            'day:th': () => this.getThaiDay(),
            'day:eg': () => this.getEnglishDay(),
            'ping:ms': () => this.getPing(),
            'temp:c': () => this.getTemperature(),
            'ram:g': () => this.getRAM(),
            'cpu:g': () => this.getCPU()
        };
    }

    toFullWidth(str) {
        const fullWidthMap = {
            '0': '０', '1': '１', '2': '２', '3': '３', '4': '４',
            '5': '５', '6': '６', '7': '７', '8': '８', '9': '９',
            ':':':', '/': '/', ' ': ' ', '-': '－'
        };
        
        return str.replace(/[0-9:\/ -]/g, char => fullWidthMap[char] || char);
    }


    toBoldNumbers(str) {
        const boldMap = {
            '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒',
            '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
        };
        
        return str.replace(/[0-9]/g, char => boldMap[char] || char);
    }


    toBoldText(str) {
        const boldMap = {
            'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆',
            'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍',
            'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔',
            'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
            'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠',
            'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧',
            'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮',
            'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳'
        };
        
        return str.replace(/[A-Za-z]/g, char => boldMap[char] || char);
    }

    getFullWidthTime() {
        const now = new Date();
        // (UTC+7)
        const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const hours = thaiTime.getUTCHours().toString().padStart(2, '0');
        const minutes = thaiTime.getUTCMinutes().toString().padStart(2, '0');
        return this.toFullWidth(`${hours}:${minutes}`);
    }

    // วันที่แบบตัวเลข
    getNumericDate() {
        const now = new Date();
        // แปลงเป็นเวลาไทย (UTC+7)
        const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const day = thaiTime.getUTCDate().toString().padStart(2, '0');
        const month = (thaiTime.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = thaiTime.getUTCFullYear() + 543; // แปลงเป็นพุทธศักราช
        return this.toBoldNumbers(`${day}/${month}/${year}`);
    }

    // วันที่แบบไทย
    getThaiDate() {
        const now = new Date();
        // แปลงเป็นเวลาไทย (UTC+7)
        const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const day = thaiTime.getUTCDate().toString().padStart(2, '0');
        const year = thaiTime.getUTCFullYear() + 543; // แปลงเป็นพุทธศักราช
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        const month = thaiMonths[thaiTime.getUTCMonth()];
        return this.toBoldNumbers(`${day}`) + `/${month}/` + this.toBoldNumbers(`${year}`);
    }

    // วันที่แบบอังกฤษ
    getEnglishDate() {
        const now = new Date();
        // แปลงเป็นเวลาไทย (UTC+7)
        const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const day = thaiTime.getUTCDate().toString().padStart(2, '0');
        const year = thaiTime.getUTCFullYear(); // ใช้ปี ค.ศ.
        const englishMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const month = englishMonths[thaiTime.getUTCMonth()];
        return this.toBoldNumbers(`${day}`) + '/' + this.toBoldText(month) + '/' + this.toBoldNumbers(`${year}`);
    }

    // วันแบบไทย
    getThaiDay() {
        const now = new Date();
        // แปลงเป็นเวลาไทย (UTC+7)
        const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
        return thaiDays[thaiTime.getUTCDay()];
    }

    // วันแบบอังกฤษ
    getEnglishDay() {
        const now = new Date();
        // แปลงเป็นเวลาไทย (UTC+7)
        const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return this.toBoldText(englishDays[thaiTime.getUTCDay()]);
    }

    getPing() {
        const startTime = Date.now();
        const ping = Math.floor(Math.random() * 50) + Date.now() % 100;
        return `${ping}`;
    }

    getTemperature() {
        try {
            const baseTemp = 25; // อุณหภูมิฐาน
            const variation = (Math.random() - 0.5) * 10; // ความแปรปรวน ±5 องศา
            const temp = (baseTemp + variation).toFixed(1);
            return `${temp}`;
        } catch (error) {
            // fallback
            const temp = (Math.random() * 15 + 20).toFixed(1);
            return `${temp}`;
        }
    }

    // RAM
    getRAM() {
        const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024));
        return `${totalMem}`;
    }

    // CPU
    getCPU() {
        const cpus = os.cpus();
        if (cpus.length > 0) {
            const model = cpus[0].model;
            const speed = (cpus[0].speed / 1000).toFixed(1);
            const boldModel = this.toBoldText(model.replace(/\s+/g, ' '));
            const boldSpeed = this.toBoldNumbers(speed);
            return `${boldModel} ${boldSpeed}`;
        }
        return this.toBoldText('Unknown CPU');
    }

    processText(text) {
        if (!text || typeof text !== 'string') return text;
        
        let processedText = text;

        for (const [key, handler] of Object.entries(this.keys)) {
            if (processedText.includes(key)) {
                try {
                    const value = handler();
                    processedText = processedText.replace(new RegExp(key, 'g'), value);
                } catch (error) {
                    console.error(`Error processing key ${key}:`, error);
                    processedText = processedText.replace(new RegExp(key, 'g'), key);
                }
            }
        }
        
        return processedText;
    }

    processTextArray(textArray) {
        if (!Array.isArray(textArray)) return textArray;
        
        return textArray.map(text => {
            if (typeof text === 'string') {
                return this.processText(text);
            } else if (typeof text === 'object' && text !== null) {
                const processed = { ...text };
                if (processed.name) {
                    processed.name = this.processText(processed.name);
                }
                return processed;
            }
            return text;
        });
    }

    processConfig(config) {
        if (!config || typeof config !== 'object') return config;
        
        const processedConfig = { ...config };
        
        const textFields = ['text1', 'text2', 'text3'];
        textFields.forEach(field => {
            if (processedConfig[field]) {
                processedConfig[field] = this.processTextArray(processedConfig[field]);
            }
        });

        const buttonFields = ['button-1', 'button-2'];
        buttonFields.forEach(field => {
            if (processedConfig[field]) {
                processedConfig[field] = this.processTextArray(processedConfig[field]);
            }
        });
        
        return processedConfig;
    }
}

module.exports = KeyDynamic;