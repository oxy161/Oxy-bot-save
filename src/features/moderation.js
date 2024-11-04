import { SlashCommandBuilder } from 'discord.js';
import { db } from '../database.js';

export function setupModeration(client) {
  // Ban Command
  const banCommand = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false));

  // Unban Command
  const unbanCommand = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('The ID of the user to unban')
        .setRequired(true));

  // Warn Command
  const warnCommand = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true));

  // Lockdown Command
  const lockdownCommand = new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Toggle lockdown mode')
    .addBooleanOption(option =>
      option.setName('enable')
        .setDescription('Enable or disable lockdown')
        .setRequired(true));

  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    try {
      switch (commandName) {
        case 'ban':
          const userToBan = interaction.options.getUser('user');
          const banReason = interaction.options.getString('reason') || 'No reason provided';
          await interaction.guild.members.ban(userToBan, { reason: banReason });
          await interaction.reply(`Banned ${userToBan.tag} for: ${banReason}`);
          break;

        case 'unban':
          const userId = interaction.options.getString('userid');
          await interaction.guild.members.unban(userId);
          await interaction.reply(`Unbanned user with ID: ${userId}`);
          break;

        case 'warn':
          const userToWarn = interaction.options.getUser('user');
          const warnReason = interaction.options.getString('reason');
          
          db.prepare(`
            INSERT INTO warns (userId, guildId, reason, moderatorId, timestamp)
            VALUES (?, ?, ?, ?, ?)
          `).run(userToWarn.id, interaction.guild.id, warnReason, interaction.user.id, Date.now());

          await interaction.reply(`Warned ${userToWarn.tag} for: ${warnReason}`);
          break;

        case 'lockdown':
          const enable = interaction.options.getBoolean('enable');
          const channels = await interaction.guild.channels.fetch();
          
          channels.forEach(async channel => {
            if (channel.isTextBased()) {
              await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SEND_MESSAGES: !enable
              });
            }
          });

          await interaction.reply(`Server lockdown ${enable ? 'enabled' : 'disabled'}`);
          break;
      }
    } catch (error) {
      console.error('Error in moderation command:', error);
      await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
    }
  });
}