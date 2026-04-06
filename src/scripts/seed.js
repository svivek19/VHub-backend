import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";

import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// ================= CONFIG =================
const OTHER_USERS = 500; // 500 users
const MESSAGES_PER_CONVO = 2000; // 500 * 2000 = 1,000,000
const BATCH_SIZE = 1000; // SAFE for Atlas

const EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

async function seed() {
  console.time("Seeding Time");

  await mongoose.connect(MONGO_URI);
  console.log("DB connected");

  await Promise.all([
    User.deleteMany(),
    Conversation.deleteMany(),
    Message.deleteMany(),
  ]);

  const hashedPassword = await bcrypt.hash("password123", 10);

  // ========================
  // 1️⃣ MAIN USER
  // ========================
  const mainUser = await User.create({
    name: "Test User",
    email: "testuser@chat.com",
    password: hashedPassword,
    isOnline: true,
    lastSeen: new Date(),
  });

  // ========================
  // 2️⃣ OTHER USERS
  // ========================
  const otherUsers = await User.insertMany(
    Array.from({ length: OTHER_USERS }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: hashedPassword,
      isOnline: faker.datatype.boolean(),
      lastSeen: faker.date.recent(),
    })),
  );

  console.log("Users:", otherUsers.length + 1);

  // ========================
  // 3️⃣ CONVERSATIONS
  // ========================
  const conversations = await Conversation.insertMany(
    otherUsers.map((user) => ({
      participants: [mainUser._id, user._id],
      lastMessage: "",
    })),
  );

  console.log("Conversations:", conversations.length);

  // ========================
  // 4️⃣ MESSAGES (STREAMING)
  // ========================
  let totalMessages = 0;

  for (let i = 0; i < conversations.length; i++) {
    const convo = conversations[i];
    const otherUser = otherUsers[i];

    let batch = [];
    let lastMessageText = "";

    for (let j = 0; j < MESSAGES_PER_CONVO; j++) {
      const isMainSender = Math.random() < 0.5;
      const sender = isMainSender ? mainUser._id : otherUser._id;

      const text = faker.lorem.sentence();

      // random reply (lightweight)
      const replyTo =
        Math.random() < 0.1 && batch.length > 0
          ? batch[Math.floor(Math.random() * batch.length)]._id
          : null;

      // random reactions
      let reactions = [];
      if (Math.random() < 0.25) {
        const count = Math.floor(Math.random() * 2) + 1;
        for (let k = 0; k < count; k++) {
          reactions.push({
            user: Math.random() < 0.5 ? mainUser._id : otherUser._id,
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          });
        }
      }

      batch.push({
        conversation: convo._id,
        sender,
        text,
        seen: !isMainSender,
        createdAt: faker.date.recent({ days: 7 }),
        replyTo,
        reactions,
      });

      lastMessageText = text;

      // 🚀 INSERT BATCH
      if (batch.length === BATCH_SIZE) {
        await Message.insertMany(batch);
        totalMessages += batch.length;
        batch = [];
      }
    }

    // insert remaining
    if (batch.length > 0) {
      await Message.insertMany(batch);
      totalMessages += batch.length;
    }

    // update last message (NO find, O(1))
    await Conversation.updateOne(
      { _id: convo._id },
      { $set: { lastMessage: lastMessageText } },
    );

    // progress log
    if ((i + 1) % 50 === 0) {
      console.log(`Processed ${i + 1}/${conversations.length} convos`);
    }
  }

  console.log("Total messages:", totalMessages);

  console.timeEnd("Seeding Time");

  await mongoose.disconnect();
  console.log("DONE ✅");
}

seed().catch(console.error);
