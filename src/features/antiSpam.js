import { Events } from 'discord.js';
import { db } from '../database.js';

const SPAM_THRESHOLD = 5;
const TIME_WINDOW = 5000; // 5 seconds

export function setupAntiSpam(client) {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const userData = db.prepare('SELECT * FROM spam_detection WHERE userId = ? AND guildId = ?')
      .get(message.author.id, message.guild.id);

    const now = Date.now();

    if (!userData) {
      db.prepare('INSERT INTO spam_detection (userId, guildId, messageCount, lastMessageTime) VALUES (?, ?, ?, ?)')
        .run(message.author.id, message.guild.id, 1, now);
      return;
    }

    if (now - userData.lastMessageTime < TIME_WINDOW) {
      const newCount = userData.messageCount + 1;
      
      if (newCount >= SPAM_THRESHOLD) {
        try {
          // Delete spam messages
          const messages = await message.channel.messages.fetch({ limit: SPAM_THRESHOLD });
          const userMessages = messages.filter(m => m.author.id === message.author.id);
          await message.channel.bulkDelete(userMessages);

          // Timeout the user
          await message.member.timeout(60000, 'Spam detected');

          // Reset counter
          db.prepare('UPDATE spam_detection SET messageCount = 0, lastMessageTime = ? WHERE userId = ? AND guildId = ?')
            .run(now, message.author.id, message.guild.id);

          // Log the incident
          const logChannel = message.guild.channels.cache.find(c => c.name === 'security-logs');
          if (logChannel) {
            await logChannel.send({
              embeds: [{
                title: '🚫 Spam Detected',
                description: `User ${message.author} has been timed out for spamming.`,
                color: 0xFF0000
              }]
            });
          }
        } catch (error) {
          console.error('Error handling spam:', error);
        }
      } else {
        db.prepare('UPDATE spam_detection SET messageCount = ?, lastMessageTime = ? WHERE userId = ? AND guildId = ?')
          .run(newCount, now, message.author.id, message.guild.id);
      }
    } else {
      db.prepare('UPDATE spam_detection SET messageCount = 1, lastMessageTime = ? WHERE userId = ? AND guildId = ?')
        .run(now, message.author.id, message.guild.id);
    }
  });
}