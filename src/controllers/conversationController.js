import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email lastSeen isOnline")
      .sort({ updatedAt: -1 });

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (convo) => {
        const unreadCount = await Message.countDocuments({
          conversation: convo._id,
          sender: { $ne: req.user._id },
          seen: false,
        });

        return {
          ...convo.toObject(),
          unreadCount,
        };
      }),
    );

    return res.json(conversationsWithUnread);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
