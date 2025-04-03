import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import Fuse from "fuse.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Configuration
const CONFIG = {
  SUPPORT_CHANNEL_ID: process.env.SUPPORT_CHANNEL_ID, // Channel where bot should respond
  RATE_LIMIT: {
    MAX_MESSAGES: 10, // Maximum messages per time window
    TIME_WINDOW: 60000, // Time window in milliseconds (1 minute)
  },
  COOLDOWN: 3000, // Cooldown between bot responses in milliseconds
};

// Rate limiting system
const userRateLimits = new Map();

function isRateLimited(userId) {
  const now = Date.now();
  const userLimit = userRateLimits.get(userId) || { count: 0, timestamp: now };

  // Reset if time window has passed
  if (now - userLimit.timestamp > CONFIG.RATE_LIMIT.TIME_WINDOW) {
    userRateLimits.set(userId, { count: 1, timestamp: now });
    return false;
  }

  // Check if user has exceeded limit
  if (userLimit.count >= CONFIG.RATE_LIMIT.MAX_MESSAGES) {
    return true;
  }

  // Increment count
  userRateLimits.set(userId, {
    count: userLimit.count + 1,
    timestamp: userLimit.timestamp,
  });
  return false;
}

// Message cooldown system
const lastResponseTime = new Map();

function isOnCooldown(channelId) {
  const now = Date.now();
  const lastResponse = lastResponseTime.get(channelId) || 0;

  if (now - lastResponse < CONFIG.COOLDOWN) {
    return true;
  }

  lastResponseTime.set(channelId, now);
  return false;
}

// Function to check if message should be processed
function shouldProcessMessage(message) {
  // Ignore bot messages
  if (message.author.bot) return false;

  // Check if message is in the support channel
  if (message.channelId !== CONFIG.SUPPORT_CHANNEL_ID) return false;

  // Ignore system messages (joins, leaves, etc.)
  if (message.type !== 0) return false;

  // Ignore empty messages
  if (!message.content.trim()) return false;

  // Check rate limiting
  if (isRateLimited(message.author.id)) {
    message.reply(
      "Please wait a moment before asking more questions. This helps prevent spam and ensures everyone gets help."
    );
    return false;
  }

  // Check cooldown
  if (isOnCooldown(message.channelId)) {
    return false;
  }

  return true;
}

// Common variations and synonyms for technical terms
const KEYWORD_VARIATIONS = {
  tunnel: ["tunnel", "tunneling", "tunnels", "tunneled", "tunnels"],
  url: ["url", "link", "address", "endpoint", "domain"],
  connection: [
    "connection",
    "connect",
    "connecting",
    "connected",
    "connects",
    "disconnect",
    "disconnected",
  ],
  reset: ["reset", "resetting", "resets", "reset password", "change password"],
  password: ["password", "pass", "pwd", "ssh key", "ssh-key", "sshkey"],
  platform: [
    "platform",
    "platforms",
    "os",
    "operating system",
    "windows",
    "linux",
    "mac",
    "android",
  ],
  tcp: ["tcp", "tcp tunnel", "tcp forwarding"],
  tls: ["tls", "tls tunnel", "ssl", "secure", "encryption", "encrypted"],
  data: ["data", "traffic", "information", "content", "read", "access"],
  timeout: [
    "timeout",
    "time out",
    "time-out",
    "expires",
    "expire",
    "expired",
    "60 minutes",
  ],
  error: [
    "error",
    "errors",
    "problem",
    "issue",
    "trouble",
    "not working",
    "broken",
    "fail",
    "failed",
  ],
  closed: [
    "closed",
    "close",
    "closing",
    "disconnected",
    "disconnect",
    "drop",
    "dropped",
  ],
  working: [
    "working",
    "works",
    "function",
    "functions",
    "run",
    "runs",
    "start",
    "starts",
  ],
  debugger: [
    "debugger",
    "debug",
    "debugging",
    "inspect",
    "inspection",
    "monitor",
  ],
  encryption: [
    "encryption",
    "encrypted",
    "encrypt",
    "secure",
    "security",
    "private",
    "privacy",
  ],
  localhost: ["localhost", "127.0.0.1", "local", "local server"],
  permanent: [
    "permanent",
    "persistent",
    "fixed",
    "static",
    "unchanging",
    "same",
  ],
  server: ["server", "servers", "location", "locations", "region", "regions"],
  ssh: ["ssh", "ssh-key", "sshkey", "ssh key", "ssh command", "ssh client"],
};

// Simple FAQ system (modify this)
const FAQS = [
  {
    question: "It is asking for a password.",
    answer:
      "If the SSH command prompts you for a password, you can just press enter (a blank password) or type in something random and press enter.\n\nFor long-running tunnels with auto-reconnect, generate an SSH key:\n\n**In your terminal/command prompt, run:** `ssh-keygen`\n\nPress the Enter key (Return key) until the command finishes. After this, the SSH command will no longer ask for a password.",
  },
  {
    question: "On Windows, the tunnel cannot reach localhost.",
    answer:
      "In Windows, sometimes the SSH tunnel cannot reach localhost because of a bug in the SSH client. **Replace `localhost` with `127.0.0.1` in your Pinggy command.**\n\n**Example:**\n```sh\nssh -p 443 -R0:127.0.0.1:8000 -L4300:127.0.0.1:4300 qr@a.pinggy.io\n```",
  },
  {
    question:
      "The command uses SSH. Doesn't it open up my computer to threats?",
    answer:
      "Pinggy relies on SSH remote port forwarding. The option `-R 0:localhost:8000` in the command only implies that connections to the public URL given by Pinggy are forwarded to your `localhost:8000`.\n\nNo other port than the one specified by you can be accessed by Pinggy or by anyone through the public URLs provided by Pinggy.\n\nYou can read more about the `-R` option of OpenSSH client [here](https://man7.org/linux/man-pages/man1/ssh.1.html). If you are using a different SSH client, refer to its documentation.",
  },
  {
    question: "Where are Pinggy servers located?",
    answer:
      "`a.pinggy.io` is routed to the Pinggy server nearest to your location. Currently, we have our servers in the USA, Europe, UK, Singapore, Brazil, and Australia.",
  },
  {
    question: "The URL changes after I restart the tunnel.",
    answer:
      "Pinggy's free plan has a tunnel timeout of 60 minutes. If the tunnel is closed by you or reaches the time limit, starting a new tunnel will generate a new URL.\n\nTo obtain a permanent or persistent URL, or to use your own domain, you must subscribe to Pinggy Pro.",
  },
  {
    question:
      "Does it work on all platforms: Linux, Windows, Mac, and Android?",
    answer:
      "Yes. Current versions of Windows, Mac, as well as almost all Linux distributions come with the OpenSSH client pre-installed. Therefore, Pinggy will work out of the box.\n\nTo learn more about using Pinggy on Android, read our [blog post](https://pinggy.io/blog/pinggy-on-android/).",
  },
  {
    question: "How to use TCP and TLS tunnels?",
    answer:
      'You can use TCP and TLS tunnels for free with Pinggy. Click on **"Advanced Settings"** at the top of the homepage and select **TCP**.',
  },
  {
    question: "My tunnel breaks or stops working after a few minutes.",
    answer:
      "Read our guide on long-running tunnels [here](https://pinggy.io/docs/long_running_tunnels/).",
  },
  {
    question: "I am getting Connection closed / Connection reset error.",
    answer:
      "Make sure you do not add any arbitrary argument after the SSH command.\n\nOne common reason for this is that an existing tunnel with the same token is active.\n\n**Terminate your existing tunnel with the same token.** You can do so from the **Active Tunnels** option in the dashboard.\n\nYou can also use the **Force** option in the dashboard.",
  },
  {
    question: "Can Pinggy read my data?",
    answer:
      "Pinggy does read tunnel traffic for providing the Web Debugger feature.\n\n**Use TLS tunnels for Zero Trust mode**, where Pinggy cannot read your data. In this case, your traffic is end-to-end encrypted.",
  },
];

// Function to clean and normalize text
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
    .replace(/\?+/g, "") // Remove question marks
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Function to extract keywords from text
function extractKeywords(text) {
  const normalized = normalizeText(text);
  const words = normalized.split(" ");
  const keywords = new Set();

  // Add individual words
  words.forEach((word) => keywords.add(word));

  // Add variations for each word
  words.forEach((word) => {
    for (const [key, variations] of Object.entries(KEYWORD_VARIATIONS)) {
      if (variations.includes(word)) {
        variations.forEach((variation) => keywords.add(variation));
      }
    }
  });

  // Add common phrases
  const phrases = normalized.split(/\s+/);
  for (let i = 0; i < phrases.length - 1; i++) {
    keywords.add(`${phrases[i]} ${phrases[i + 1]}`);
  }

  // For very short queries (1-2 words), add more variations
  if (words.length <= 2) {
    words.forEach((word) => {
      // Add question variations
      keywords.add(`what is ${word}`);
      keywords.add(`how to ${word}`);
      keywords.add(`need help with ${word}`);
      keywords.add(`help with ${word}`);
      keywords.add(`about ${word}`);
      // Add variations with question marks
      keywords.add(`${word}?`);
      keywords.add(`${word}??`);
      keywords.add(`${word}???`);
    });
  }

  return Array.from(keywords);
}

// Create a Fuse instance for fuzzy searching
const fuse = new Fuse(FAQS, {
  keys: ["question"], // Specify the key to search in
  threshold: 0.3, // Adjust the threshold for fuzzy matching (0.0 - exact match, 1.0 - no match)
});

// Function to match user question with improved matching
function findFAQMatch(message) {
  const messageKeywords = extractKeywords(message);

  // Use Fuse to search for the best match
  const result = fuse.search(message);

  // Check if we have a match
  if (result.length > 0) {
    return result[0].item.answer; // Return the answer of the best match
  }

  return "I couldn't find a matching answer. Please try rephrasing your question or contact support!";
}

// Test function to try various queries
function testFAQQueries() {
  const testQueries = [
    // Password related queries
    "what is the password",
    "how to change my password",
    "ssh asking for password",
    "need help with password",

    // Connection related queries
    "connection keeps dropping",
    "tunnel keeps disconnecting",
    "getting connection errors",
    "connection reset error",

    // Platform specific queries
    "windows localhost issue",
    "tunnel not working on windows",
    "localhost problem windows",

    // Security related queries
    "is my data secure",
    "can pinggy see my data",
    "is it encrypted",

    // URL related queries
    "url keeps changing",
    "link not permanent",
    "how to get permanent url",

    // General queries
    "tunnel not working",
    "what platforms are supported",
    "where are the servers located",

    // Error related queries
    "getting errors",
    "tunnel stopped working",
    "connection closed error",
  ];

  console.log("Testing FAQ matching system...\n");

  testQueries.forEach((query) => {
    console.log(`Query: "${query}"`);
    const response = findFAQMatch(query);
    console.log("Response:", response.substring(0, 100) + "...\n");
  });
}

// debug
// testFAQQueries();

// Bot ready
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Validate configuration
  if (!CONFIG.SUPPORT_CHANNEL_ID) {
    console.error("ERROR: SUPPORT_CHANNEL_ID is not set in .env file!");
    process.exit(1);
  }
});

// Handle messages
client.on("messageCreate", async (message) => {
  try {
    if (!shouldProcessMessage(message)) return;

    const response = findFAQMatch(message.content);
    await message.reply(response);
  } catch (error) {
    console.error("Error processing message:", error);
    try {
      await message.reply(
        "I encountered an error while processing your message. Please try again later."
      );
    } catch (replyError) {
      console.error("Error sending error message:", replyError);
    }
  }
});

// Handle errors
client.on("error", (error) => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Start bot
client.login(process.env.DISCORD_TOKEN);
