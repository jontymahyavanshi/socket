// server/handlers/callHandler.js

export const callHandler = (io, socket, onlineUsers) => {
  
  // 1. Initiate Call
  // Frontend emits this when user clicks the Phone/Video icon
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    const targetSocketId = onlineUsers[userToCall]; // userToCall is the UserID
    
    if (targetSocketId) {
      io.to(targetSocketId).emit("callUser", { 
        signal: signalData, 
        from, 
        name 
      });
    } else {
      // Optional: Notify caller that user is offline
      io.to(socket.id).emit("callFailed", { reason: "User is offline" });
    }
  });

  // 2. Answer Call
  // Frontend emits this when the receiver accepts the call
  socket.on("answerCall", (data) => {
    const targetSocketId = onlineUsers[data.to]; // data.to is Caller's UserID
    
    if (targetSocketId) {
      io.to(targetSocketId).emit("callAccepted", data.signal);
    }
  });

  // 3. End Call
  // Frontend emits this when either side hangs up
  socket.on("endCall", ({ to }) => {
    const targetSocketId = onlineUsers[to];
    
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded");
    }
  });
};