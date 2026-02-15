import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const message = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: user._id },
      ],
    }).sort({ createdAt: 1 });

    return res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
