// server/handlers/messageController.js

// Update function signature to accept 'Message' model
export const deleteMessage = async (req, res, io, onlineUsers, Message) => {
  const { msgId, userId, type } = req.body; 

  try {
    // Now uses the Message model passed in arguments
    const msg = await Message.findById(msgId);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (type === 'me') {
        if (!msg.deletedFor.includes(userId)) {
            msg.deletedFor.push(userId);
            await msg.save();
        }
        return res.json({ success: true, type: 'me' });
    } 
    
    else if (type === 'everyone') {
        if (msg.sender.toString() !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }
        
        await Message.findByIdAndDelete(msgId);
        
        if(msg.isGroup) {
            io.to(msg.receiver.toString()).emit("message_deleted", { msgId });
        } else {
            const receiverSocket = onlineUsers[msg.receiver.toString()];
            if(receiverSocket) io.to(receiverSocket).emit("message_deleted", { msgId });
            
            const senderSocket = onlineUsers[msg.sender.toString()];
            if(senderSocket) io.to(senderSocket).emit("message_deleted", { msgId });
        }
        
        return res.json({ success: true, type: 'everyone' });
    }
  } catch (err) { 
      console.error(err);
      res.status(500).json({ error: "Failed to delete" }); 
  }
};