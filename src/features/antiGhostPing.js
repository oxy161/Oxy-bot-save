import { Events } from 'discord.js';

const recentMessages = new Map();

export function setupAntiGhostPing(client) {
  client.on(Events.MessageCreate, message => {
    if (message.mentions.users.size > 0 || message.mentions.roles.size > 0) {
      recentMessages.set(message.id, {
        content: message.content,
        author: message.author.tag,
        mentions: [...message.mentions.users.values(), ...message.mentions.roles.values()]
      });
    }
  });

  client.on(Events.MessageDelete, async message => {
    const ghostPing = recentMessages.get(message.id);
    if (ghostPing && (message.mentions.users.size > 0 || message.mentions.roles.size > 0)) {
      const logChannel = message.guild.channels.cache.find(c => c.name === 'security-logs');
      if (logChannel) {
        await logChannel.send({
          embeds: [{
            title: '👻 Ghost Ping Detected',
            description: `**Author:** ${ghostPing.author}\n**Content:** ${ghostPing.content}\n**Mentions:** ${ghostPing.mentions.map(m => m.toString()).join(', ')}`,
            color: 0xFF0000,
            timestamp: new Date()
          }]
        });
      }
    }
    recentMessages.delete(message.id);
  });
}