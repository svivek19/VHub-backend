import Conversation from "../models/Conversation.js";
import redis from "../config/redis.js";
import Message from "../models/Message.js";

export const getConversations = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 30;

    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email lastSeen isOnline")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (convo) => {
        let unread = await redis.get(`unread:${req.user._id}:${convo._id}`);

        if (unread === null) {
          const count = await Message.countDocuments({
            conversation: convo._id,
            sender: { $ne: req.user._id },
            seen: false,
          });

          unread = count;

          if (count > 0) {
            await redis.set(`unread:${req.user._id}:${convo._id}`, count);
          }
        }

        return {
          ...convo,
          unreadCount: Number(unread) || 0,
        };
      }),
    );

    return res.json(conversationsWithUnread);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
