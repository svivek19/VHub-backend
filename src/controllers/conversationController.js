import Conversation from "../models/Conversation.js";

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email avatar")
      .sort({ updatedAt: -1 });

    return res.json(conversations);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
