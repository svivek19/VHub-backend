import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const onlineUsers = new Map();

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user-connected", (userId) => {
      onlineUsers.set(String(userId), socket.id);
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
      }

      socket.emit("receive-message", message);
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
};

export default socketHandler;
