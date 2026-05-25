const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const uri = process.env.MONGODB_URI || "mongodb+srv://vpcn67_db_user:7MY7K2N4IMaNOsW3@cluster0.mongodb.net/4amDB?retryWrites=true&w=majority";
const client = new MongoClient(uri);

const token = "YOUR_BOT_TOKEN_HERE";

client.connect().then(() => {
console.log("Connected to MongoDB");
db = client.db("4amDB");
});

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

discordClient.once('ready', () => {
console.log(`Logged in as ${discordClient.user.tag}`);

const commands = [
new SlashCommandBuilder()
.setName('keygen')
.setDescription('Generate a new 4am key (32 chars)'),
new SlashCommandBuilder()
.setDescription('Add a custom key')
.setName('addkey')
.addStringOption(option => option.setName('key').setDescription('The custom key').setRequired(true)),
new SlashCommandBuilder()
.setDescription('Check if a key is valid')
.setName('checkkey')
.addStringOption(option => option.setName('key').setDescription('The key to check').setRequired(true)),
new SlashCommandBuilder()
.setDescription('Register your HWID to your account')
.setName('hwidregister')
.addStringOption(option => option.setName('hwid').setDescription('Your HWID').setRequired(true)),
new SlashCommandBuilder()
.setDescription('Reset HWID assignment for a specific key')
.setName('hwidreset')
.addStringOption(option => option.setName('key').setDescription('The key to reset').setRequired(true)),
new SlashCommandBuilder()
.setDescription('View HWID Usage')
.setName('hwidusage')
].map(command => command.toJSON());

const rest = new REST().setToken(token);

(async () => {
try {
console.log('Started refreshing application (/) commands.');
await rest.put(
Routes.applicationCommands(discordClient.application.id),
{ body: commands },
);
console.log('Successfully reloaded application (/) commands.');
} catch (error) {
console.error(error);
}
})();
});

discordClient.on('interactionCreate', async interaction => {
if (!interaction.isChatInputCommand()) return;

const { commandName } = interaction;

if (commandName === 'keygen') {
const key = "KEY-" + Math.random().toString(36).substring(2, 10).toUpperCase();

await db.collection("keys").insertOne({
key: key,
hwid: "decay073117", // Hardcoded HWID for generated keys
assigned: true,
createdAt: new Date()
});

await interaction.reply({ content: `Generated Key: **${key}**`, ephemeral: true });
}

if (commandName === 'addkey') {
const inputKey = interaction.options.getString('key');

await db.collection("keys").insertOne({
key: inputKey,
hwid: "decay073117", // Hardcoded HWID for custom keys
assigned: true,
createdAt: new Date()
});

await interaction.reply({ content: `Added Custom Key: **${inputKey}**`, ephemeral: true });
}

if (commandName === 'checkkey') {
const inputKey = interaction.options.getString('key');

const keyDoc = await db.collection("keys").findOne({ key: inputKey });

if (keyDoc) {
if (keyDoc.assigned && keyDoc.hwid) {
await interaction.reply({ content: `Key is assigned to HWID: ${keyDoc.hwid}`, ephemeral: true });
} else {
await interaction.reply({ content: `Key is valid!`, ephemeral: true });
}
} else {
await interaction.reply({ content: `Invalid Key.`, ephemeral: true });
}
}

if (commandName === 'hwidregister') {
const inputHwid = interaction.options.getString('hwid');

await db.collection("keys").updateOne(
{ hwid: inputHwid },
{ $set: { hwid: inputHwid } }
);

await interaction.reply({ content: `HWID ${inputHwid} registered!`, ephemeral: true });
}

if (commandName === 'hwidreset') {
const inputKey = interaction.options.getString('key');

const result = await db.collection("keys").updateOne(
{ key: inputKey },
{ $set: { hwid: null, assigned: false } }
);

if (result.modifiedCount > 0) {
await interaction.reply({ content: `Key **${inputKey}** HWID reset successfully.`, ephemeral: true });
} else {
await interaction.reply({ content: `Key **${inputKey}** not found or HWID was already null.`, ephemeral: true });
}
}

if (commandName === 'hwidusage') {
const keys = await db.collection("keys").find({ assigned: true }).toArray();
let count = 0;
keys.forEach(key => count++);

const embed = new EmbedBuilder()
.setTitle("HWID Usage Report")
.setDescription(`Total Assigned Keys: ${count}`)
.setColor(0x00FF00);

await interaction.reply({ embeds: [embed], ephemeral: true });
}
});
