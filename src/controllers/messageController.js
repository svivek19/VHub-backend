import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    });

    if (!conversation) {
      return res.json([]);
    }

    await Message.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: req.user._id },
        seen: false,
      },
      {
        $set: { seen: true },
      },
    );

    const messages = await Message.find({
      conversation: conversation._id,
    }).sort({ createdAt: 1 });

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
