import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const onlineUsers = new Map();
const activeChats = new Map();

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user-connected", async (userId) => {
      onlineUsers.set(String(userId), socket.id);

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      io.emit("online-users", Array.from(onlineUsers.keys()));
    });

    socket.on("send-message", async ({ senderId, receiverId, text }) => {
      console.log({
        senderId,
        receiverId,
        onlineUsers: [...onlineUsers.entries()],
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
      });

      // update last message
      conversation.lastMessage = text;
      await conversation.save();

      // emit to receiver
      const receiverSocket = onlineUsers.get(receiverId);
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
    });

    socket.on("disconnect", async () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);

          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          break;
        }
      }

      io.emit("online-users", Array.from(onlineUsers.keys()));
    });

    socket.on("typing", ({ senderId, receiverId }) => {
      const receiverSocket = onlineUsers.get(String(receiverId));

      if (receiverSocket) {
        io.to(receiverSocket).emit("typing", {
          senderId,
        });
      }
    });

    socket.on("mark-seen", async ({ conversationId }) => {
      console.log("MARK SEEN:", conversationId);

      await Message.updateMany(
        {
          conversation: conversationId,
          seen: false,
        },
        { seen: true },
      );

      io.emit("messages-seen", { conversationId: String(conversationId) });
    });
  });
};

export default socketHandler;
