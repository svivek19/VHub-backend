import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";

import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// CONFIG
const OTHER_USERS = 120;
const MESSAGES_PER_CONVO = 500;

const EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

async function seed() {
  console.time("Seeding Time");

  await mongoose.connect(MONGO_URI);
  console.log("DB connected:", MONGO_URI);

  await User.deleteMany();
  await Conversation.deleteMany();
  await Message.deleteMany();

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

  console.log("Users created:", otherUsers.length + 1);

  // ========================
  // 3️⃣ CREATE CONVERSATIONS
  // ========================
  const conversations = otherUsers.map((user) => ({
    participants: [mainUser._id, user._id],
    lastMessage: "",
  }));

  const createdConvos = await Conversation.insertMany(conversations);

  console.log("Conversations created:", createdConvos.length);

  // ========================
  // 4️⃣ CREATE ALL MESSAGES (BULK)
  // ========================
  let allMessages = [];

  for (let i = 0; i < createdConvos.length; i++) {
    const convo = createdConvos[i];
    const otherUser = otherUsers[i];

    for (let j = 0; j < MESSAGES_PER_CONVO; j++) {
      const isMainSender = Math.random() < 0.5;

      allMessages.push({
        conversation: convo._id,
        sender: isMainSender ? mainUser._id : otherUser._id,
        text: faker.lorem.sentence(),
        seen: !isMainSender,
        createdAt: faker.date.recent({ days: 7 }),
      });
    }
  }

  const createdMessages = await Message.insertMany(allMessages);
  console.log("Messages created:", createdMessages.length);

  // ========================
  // 5️⃣ BULK UPDATE (REPLIES + REACTIONS)
  // ========================
  const bulkOps = [];

  for (let msg of createdMessages) {
    let update = {};

    // reply
    if (Math.random() < 0.15) {
      const randomMsg =
        createdMessages[Math.floor(Math.random() * createdMessages.length)];
      update.replyTo = randomMsg._id;
    }

    // reactions
    if (Math.random() < 0.3) {
      const reactions = [];
      const count = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < count; i++) {
        reactions.push({
          user:
            Math.random() < 0.5
              ? mainUser._id
              : faker.helpers.arrayElement(otherUsers)._id,
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        });
      }

      update.reactions = reactions;
    }

    if (Object.keys(update).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: msg._id },
          update: { $set: update },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await Message.bulkWrite(bulkOps);
  }

  console.log("Reactions + replies added");

  // ========================
  // 6️⃣ UPDATE LAST MESSAGE (BULK)
  // ========================
  const convoBulk = [];

  for (let convo of createdConvos) {
    const lastMsg = createdMessages.find(
      (m) => String(m.conversation) === String(convo._id),
    );

    if (lastMsg) {
      convoBulk.push({
        updateOne: {
          filter: { _id: convo._id },
          update: { $set: { lastMessage: lastMsg.text } },
        },
      });
    }
  }

  if (convoBulk.length > 0) {
    await Conversation.bulkWrite(convoBulk);
  }

  console.log("Last messages updated");

  console.timeEnd("Seeding Time");

  await mongoose.disconnect();

  console.log("DONE");
}

seed().catch(console.error);
