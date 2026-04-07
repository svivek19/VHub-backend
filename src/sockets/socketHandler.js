import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import redis from "../config/redis.js";

const activeChats = new Map();

const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id);

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user-connected", async (userId) => {
      if (!isValidId(userId)) {
        console.log("Invalid userId:", userId);
        return;
      }
      socket.userId = String(userId);

      await redis.set(`online:${String(userId)}`, socket.id, "EX", 3600);

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      const keys = await redis.keys("online:*");
      const users = keys.map((key) => key.split(":")[1]);

      io.emit("online-users", users);
    });

    socket.on(
      "send-message",
      async ({ senderId, receiverId, text, replyTo }) => {
        const keys = await redis.keys("online:*");

        console.log({
          senderId,
          receiverId,
          onlineUsers: keys.map((k) => k.split(":")[1]),
        });
        // find existing conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [senderId, receiverId] },
        });

        // create if first message
        if (!conversation) {
          conversation = await Conversation.create({
            participants: [senderId, receiverId],
          });
        }

        // save message
        const message = await Message.create({
          conversation: conversation._id,
          sender: senderId,
          text,
          replyTo: replyTo || null,
        });

        // update last message
        conversation.lastMessage = text;
        await conversation.save();

        // emit to receiver
        const receiverSocket = await redis.get(`online:${String(receiverId)}`);

        await redis.incr(`unread:${receiverId}:${conversation._id}`);
        if (receiverSocket) {
          io.to(receiverSocket).emit("receive-message", message);

          const activeConversation = activeChats.get(String(receiverId));

          if (activeConversation !== String(conversation._id)) {
            io.to(receiverSocket).emit("unread-message", {
              senderId,
              conversationId: conversation._id,
            });
          }
        }

        socket.emit("receive-message", message);
      },
    );

    socket.on("update-message-image", async ({ tempId, messageId, image }) => {
      try {
        let message;

        if (messageId) {
          message = await Message.findByIdAndUpdate(
            messageId,
            { image },
            { new: true },
          );
        } else {
          message = null;
        }

        if (!message) {
          return;
        }

        io.emit("message-image-updated", {
          tempId,
          messageId: String(message._id),
          image: message.image,
        });
      } catch (err) {
        console.error("update-message-image error:", err);
      }
    });

    socket.on("disconnect", async () => {
      const keys = await redis.keys("online:*");

      for (const key of keys) {
        const socketId = await redis.get(key);

        if (socketId === socket.id) {
          const userId = key.split(":")[1];

          await redis.del(key);

          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          break;
        }
      }

      const updatedKeys = await redis.keys("online:*");
      const users = updatedKeys.map((key) => key.split(":")[1]);

      io.emit("online-users", users);
    });

    socket.on("typing", async ({ senderId, receiverId }) => {
      console.log("typing event", { senderId, receiverId });

      const receiverSocket = await redis.get(`online:${String(receiverId)}`);

      console.log(receiverSocket, "receiversocket");

      if (receiverSocket) {
        io.to(receiverSocket).emit("typing", {
          senderId,
        });
      }
    });

    socket.on("stop-typing", async ({ senderId, receiverId }) => {
      const receiverSocket = await redis.get(`online:${String(receiverId)}`);

      if (receiverSocket) {
        io.to(receiverSocket).emit("stop-typing", {
          senderId,
        });
      }
    });

    socket.on("mark-seen", async ({ conversationId }) => {
      console.log("MARK SEEN:", conversationId);
      await redis.del(`unread:${socket.userId}:${conversationId}`);

      await Message.updateMany(
        {
          conversation: conversationId,
          seen: false,
        },
        { seen: true },
      );

      io.emit("messages-seen", { conversationId: String(conversationId) });
    });

    socket.on("delete-message", async ({ messageId, type, userId }) => {
      const message = await Message.findById(messageId);

      if (!message) return;

      if (type === "everyone") {
        message.isDeletedForEveryone = true;
        message.text = "This message was deleted";
      }

      if (type === "me") {
        if (!message.deletedFor.includes(userId)) {
          message.deletedFor.push(userId);
        }
      }

      await message.save();

      io.emit("message-deleted", {
        messageId,
        type,
        userId,
      });
    });

    socket.on("react-message", async ({ messageId, userId, emoji }) => {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existingIndex = message.reactions.findIndex(
        (r) => String(r.user) === String(userId),
      );

      if (existingIndex !== -1) {
        // same emoji → remove reaction
        if (message.reactions[existingIndex].emoji === emoji) {
          message.reactions.splice(existingIndex, 1);
        }
        // different emoji → update
        else {
          message.reactions[existingIndex].emoji = emoji;
        }
      } else {
        // new reaction
        message.reactions.push({ user: userId, emoji });
      }

      await message.save();

      io.emit("message-reacted", {
        messageId,
        reactions: message.reactions,
      });
    });
  });
};

export default socketHandler;
