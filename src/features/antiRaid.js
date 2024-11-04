import { Events } from 'discord.js';

const JOIN_THRESHOLD = 10;
const TIME_WINDOW = 10000; // 10 seconds
const recentJoins = new Map();

export function setupAntiRaid(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    const now = Date.now();
    const recentJoinsList = recentJoins.get(member.guild.id) || [];
    
    // Clean old joins
    while (recentJoinsList.length && recentJoinsList[0] < now - TIME_WINDOW) {
      recentJoinsList.shift();
    }
    
    recentJoinsList.push(now);
    recentJoins.set(member.guild.id, recentJoinsList);

    if (recentJoinsList.length >= JOIN_THRESHOLD) {
      // Raid detected
      try {
        await member.guild.setVerificationLevel('HIGH');
        const logChannel = member.guild.channels.cache.find(c => c.name === 'security-logs');
        if (logChannel) {
          await logChannel.send({
            embeds: [{
              title: '🚨 Raid Detected',
              description: `Detected ${recentJoinsList.length} joins in ${TIME_WINDOW/1000} seconds.\nVerification level has been increased.`,
              color: 0xFF0000
            }]
          });
        }
      } catch (error) {
        console.error('Error handling raid:', error);
      }
    }
  });
}