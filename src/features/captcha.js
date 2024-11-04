import { createCanvas } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import { db } from '../database.js';

export function setupCaptcha(client) {
  client.on('guildMemberAdd', async (member) => {
    try {
      // Create verification channel if it doesn't exist
      let verifyChannel = member.guild.channels.cache.find(c => c.name === 'verification');
      if (!verifyChannel) {
        verifyChannel = await member.guild.channels.create({
          name: 'verification',
          permissionOverwrites: [
            {
              id: member.guild.id,
              deny: ['VIEW_CHANNEL']
            }
          ]
        });
      }

      // Generate captcha
      const captcha = generateCaptcha();
      const attachment = new AttachmentBuilder(captcha.canvas.toBuffer(), { name: 'captcha.png' });

      // Store in database
      db.prepare('INSERT OR REPLACE INTO captcha_verification (userId, guildId, verified, attempts) VALUES (?, ?, ?, ?)').run(
        member.id,
        member.guild.id,
        false,
        0
      );

      // Send captcha
      await verifyChannel.send({
        content: `Welcome ${member}! Please solve this captcha to verify yourself.`,
        files: [attachment]
      });

      // Set up collector for verification
      const filter = m => m.author.id === member.id;
      const collector = verifyChannel.createMessageCollector({ filter, time: 300000 });

      collector.on('collect', async (msg) => {
        if (msg.content === captcha.text) {
          await member.roles.add(member.guild.roles.cache.find(r => r.name === 'Verified'));
          collector.stop('success');
        } else {
          const attempts = db.prepare('SELECT attempts FROM captcha_verification WHERE userId = ?').get(member.id).attempts;
          if (attempts >= 3) {
            await member.kick('Failed captcha verification');
            collector.stop('failed');
          } else {
            db.prepare('UPDATE captcha_verification SET attempts = attempts + 1 WHERE userId = ?').run(member.id);
            await msg.reply('Incorrect captcha. Please try again.');
          }
        }
      });
    } catch (error) {
      console.error('Error in captcha setup:', error);
    }
  });
}

function generateCaptcha() {
  const canvas = createCanvas(300, 100);
  const ctx = canvas.getContext('2d');
  const text = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text
  ctx.font = '40px Arial';
  ctx.fillStyle = 'black';
  ctx.fillText(text, 50, 60);

  // Add noise
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
    ctx.strokeStyle = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
    ctx.stroke();
  }

  return { canvas, text };
}