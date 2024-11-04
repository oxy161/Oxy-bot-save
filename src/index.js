import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from 'dotenv';
import { initDB } from './database.js';
import { setupAntiRaid } from './features/antiRaid.js';
import { setupCaptcha } from './features/captcha.js';
import { setupAntiSpam } from './features/antiSpam.js';
import { setupModeration } from './features/moderation.js';
import { setupAntiGhostPing } from './features/antiGhostPing.js';

config();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans
  ]
});

client.commands = new Collection();

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  initDB();
});

// Setup all security features
setupAntiRaid(client);
setupCaptcha(client);
setupAntiSpam(client);
setupModeration(client);
setupAntiGhostPing(client);

client.login(process.env.TOKEN);