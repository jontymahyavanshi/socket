// server/handlers/chatController.js

export const handleUnfriend = async (req, res, io, onlineUsers, User) => {
    const { userId, targetId } = req.body;

    try {
        // 1. Remove target from my following/followers
        await User.findByIdAndUpdate(userId, {
            $pull: { 
                following: targetId, 
                followers: targetId, 
                followRequests: targetId 
            }
        });

        // 2. Remove me from target's following/followers
        await User.findByIdAndUpdate(targetId, {
            $pull: { 
                following: userId, 
                followers: userId, 
                followRequests: userId 
            }
        });

        // 3. Real-time update: Notify the target person so their sidebar refreshes
        const targetSocket = onlineUsers[targetId];
        if (targetSocket) {
            io.to(targetSocket).emit("friend_removed", { friendId: userId });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to unfriend" });
    }
};

export const handleDeleteChat = async (req, res, Message) => {
    const { userId, targetId, isGroup } = req.body;

    try {
        if (isGroup) {
            // For groups: Mark all messages in this group as deleted for this specific user
            await Message.updateMany(
                { receiver: targetId, isGroup: true },
                { $addToSet: { deletedFor: userId } }
            );
        } else {
            // For private: Mark all messages between user A and user B as deleted for user A
            await Message.updateMany(
                {
                    isGroup: false,
                    $or: [
                        { sender: userId, receiver: targetId },
                        { sender: targetId, receiver: userId }
                    ]
                },
                { $addToSet: { deletedFor: userId } }
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear chat" });
    }
};