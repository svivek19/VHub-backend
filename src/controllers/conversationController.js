import Conversation from "../models/Conversation.js";
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

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          sender: { $ne: req.user._id },
          seen: false,
        },
      },
      {
        $group: {
          _id: "$conversation",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    unreadCounts.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    const conversationsWithUnread = conversations.map((convo) => ({
      ...convo,
      unreadCount: unreadMap[convo._id.toString()] || 0,
    }));

    return res.json(conversationsWithUnread);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
