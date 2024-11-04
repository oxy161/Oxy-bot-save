import Database from 'better-sqlite3';

const db = new Database('security.db');

export function initDB() {
  // Warns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS warns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      guildId TEXT,
      reason TEXT,
      moderatorId TEXT,
      timestamp INTEGER
    )
  `);

  // Captcha verification table
  db.exec(`
    CREATE TABLE IF NOT EXISTS captcha_verification (
      userId TEXT PRIMARY KEY,
      guildId TEXT,
      verified BOOLEAN,
      attempts INTEGER
    )
  `);

  // Spam detection table
  db.exec(`
    CREATE TABLE IF NOT EXISTS spam_detection (
      userId TEXT,
      guildId TEXT,
      messageCount INTEGER,
      lastMessageTime INTEGER
    )
  `);
}

export { db };