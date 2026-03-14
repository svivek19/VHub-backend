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
      deletedFor: { $ne: req.user._id },
    }).sort({ createdAt: 1 });

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId, type } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (type === "everyone") {
      if (String(message.sender) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      message.isDeletedForEveryone = true;
      message.text = "This message was deleted";
    }

    if (type === "me") {
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
      }
    }

    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
