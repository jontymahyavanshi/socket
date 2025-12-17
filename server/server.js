// server/server.js
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import multer from 'multer'; 
import path from 'path';     
import fs from 'fs';        

// --- IMPORT HANDLERS ---
import { callHandler } from './handlers/callHandler.js'; 
import { deleteMessage } from './handlers/messageController.js';

const port = 5000;
const app = express();
const server = createServer(app);

// --- 1. SETUP UPLOADS FOLDER ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// --- CONFIGURATION ---
const io = new Server(server, {
  cors: { 
    origin: [ "http://localhost:5173", 
              "http://localhost:3000",
              /* "http://10.142.215.2:5173", 
              "http://10.142.215.2:3000" */
            ], 
    methods: ["GET", "POST", "PUT"], 
    credentials: true 
  }
});

// --- GLOBAL STATE (Moved to top so routes can access it) ---
let onlineUsers = {}; 

app.use(cors());
app.use(express.json({ limit: "10mb" })); 

// --- 2. SERVE STATIC FILES ---
app.use('/uploads', express.static('uploads'));

// --- 3. CONFIGURE MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/chatapp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// --- SCHEMAS ---

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  about: { type: String, default: "Hey there! I am using WhatsApp+" }, 
  profilePic: { type: String, default: "" }, 
  
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],       
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],       
  followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]   
});
const User = mongoose.model('User', userSchema);

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  groupPic: { type: String, default: "" }, 
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
const Group = mongoose.model('Group', groupSchema);

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, required: true }, 
  message: String,
  isGroup: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String 
  }],
  // --- NEW FIELD: Tracks users who deleted this message for themselves ---
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]       
});
const Message = mongoose.model('Message', messageSchema);

// --- API ROUTES ---

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

app.post('/register', async (req, res) => { 
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.json({success: true, userId: newUser._id});
    } catch(e) { 
        res.status(500).json({error: "Registration failed"}); 
    }
});

app.post('/login', async (req, res) => { 
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if(!user) return res.status(401).json({error: "User not found"});

        const isMatch = await bcrypt.compare(password, user.password);
        
        if(isMatch) {
            res.json({
                success:true, 
                user: { 
                    _id: user._id, 
                    name: user.name, 
                    email: user.email,
                    about: user.about,
                    profilePic: user.profilePic
                }
            });
        } else {
            res.status(401).json({error: "Invalid credentials"});
        }
    } catch(e) {
        res.status(500).json({error: "Login error"});
    }
});

app.put('/user/update', async (req, res) => {
  const { userId, name, about, profilePic } = req.body; 
  try {
    const user = await User.findByIdAndUpdate(
      userId, 
      { name, about, profilePic }, 
      { new: true } 
    ).select('-password');

    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.get('/users', async (req, res) => {
  const users = await User.find({}, 'name followRequests about profilePic') 
    .populate('followRequests', 'name profilePic'); 
  res.json(users);
});

app.get('/user/:id', async (req, res) => {
  try {
      const user = await User.findById(req.params.id)
        .populate('following', 'name about profilePic') 
        .populate('followRequests', 'name profilePic'); 
      res.json(user);
  } catch(e) { res.status(404).json({error: "User not found"}); }
});

// --- MESSAGING ROUTES ---

app.get('/messages', async (req, res) => { 
    const { sender, receiver } = req.query;
    try {
        // We assume the one requesting is the 'sender' or 'receiver' parameter logic
        // Ideally you pass ?requesterId=... but for now we filter in the query:
        // Exclude messages where deletedFor contains the requester (sender/receiver)
        
        const messages = await Message.find({ 
            isGroup: false,
            $or: [{sender, receiver}, {sender: receiver, receiver: sender}],
            // If the message is deleted for this user, do not return it
            deletedFor: { $ne: sender } // Assuming 'sender' query param is the current logged-in user
        })
        .populate('sender', 'name profilePic'); 
        res.json(messages);
    } catch(e) { res.status(500).json({error: "Fetch failed"}); }
});

// --- UPDATED DELETE ROUTE (Dependency Injection) ---
app.post('/delete-message', (req, res) => {
    // Pass the Message model here to avoid circular dependency
    deleteMessage(req, res, io, onlineUsers, Message);
});

app.get('/group-messages/:groupId', async (req, res) => {
    try {
        const messages = await Message.find({ 
            receiver: req.params.groupId,
            isGroup: true
            // Note: In a real app, you should filter `deletedFor` here using req.user.id
        })
        .populate('sender', 'name profilePic'); 
        res.json(messages);
    } catch(e) { res.status(500).json({error: "Fetch group failed"}); }
});

// --- GROUP ROUTES ---

app.post('/create-group', async (req, res) => {
    const { name, members, admin } = req.body; 
    const uniqueMembers = [...new Set([...members, admin])];
    
    const newGroup = new Group({ name, members: uniqueMembers, admin });
    await newGroup.save();
    res.json({ success: true, group: newGroup });
});

app.get('/groups/:userId', async (req, res) => {
    try {
        const groups = await Group.find({ members: req.params.userId });
        res.json(groups);
    } catch(e) { res.status(500).json({error: "Fetch groups failed"}); }
});

// --- NEW ROUTES FOR GROUP DETAILS FEATURES ---

// 1. Update Group Name
app.post('/update-group', async (req, res) => {
    const { groupId, newName } = req.body;
    try {
        const group = await Group.findByIdAndUpdate(groupId, { name: newName }, { new: true });
        res.json({ success: true, group });
    } catch(e) { res.status(500).json({ error: "Update failed" }); }
});

// 2. Upload Group Icon
app.post('/upload-group-icon', upload.single('image'), async (req, res) => {
    const { groupId } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file" });
    const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    
    try {
        const group = await Group.findByIdAndUpdate(groupId, { groupPic: imageUrl }, { new: true });
        res.json({ success: true, url: imageUrl, group });
    } catch(e) { res.status(500).json({ error: "DB update failed" }); }
});

// 3. Add Members to Existing Group
app.post('/add-group-member', async (req, res) => {
    const { groupId, members } = req.body;
    try {
        const group = await Group.findById(groupId);
        if(!group) return res.status(404).json({error: "Group not found"});
        
        // Add new members ensuring no duplicates
        const currentMembers = group.members.map(m => m.toString());
        const newMembers = members.filter(id => !currentMembers.includes(id));
        
        if(newMembers.length > 0) {
            group.members.push(...newMembers);
            await group.save();
        }
        res.json({ success: true, group });
    } catch(e) { res.status(500).json({ error: "Failed to add members" }); }
});

// --- GROUP MANAGEMENT ROUTES ---

app.post('/leave-group', async (req, res) => {
  const { groupId, userId } = req.body; 
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to leave" }); }
});

app.post('/delete-group', async (req, res) => {
  const { groupId, userId } = req.body;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.admin.toString() !== userId) {
      return res.status(403).json({ error: "Only admin can delete" });
    }
    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ receiver: groupId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

// --- FRIEND REQUEST ROUTES ---

app.post('/request-follow', async (req, res) => {
  const { sender, target } = req.body; 
  if (sender === target) return res.status(400).json({ error: "Cannot follow self" });
  
  try {
    const targetUser = await User.findById(target); 
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    
    if (targetUser.followers.includes(sender) || targetUser.followRequests.includes(sender)) {
      return res.json({ success: false, message: "Already sent/accepted" });
    }
    
    targetUser.followRequests.push(sender);
    await targetUser.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Request failed" }); }
});

app.post('/respond-follow', async (req, res) => {
  const { myId, requesterId, action } = req.body; 
  try {
    const me = await User.findById(myId);
    const requester = await User.findById(requesterId);

    me.followRequests = me.followRequests.filter(id => id.toString() !== requesterId);
    
    if (action === 'accept') {
      me.followers.push(requesterId);
      me.following.push(requesterId);
      
      requester.following.push(myId);
      requester.followers.push(myId);
      
      await requester.save();
    }
    await me.save();
    
    await me.populate('following', 'name profilePic');
    await me.populate('followRequests', 'name profilePic');
    
    res.json({ success: true, following: me.following, requests: me.followRequests });
  } catch (err) { res.status(500).json({ error: "Action failed" }); }
});

// --- SOCKET LOGIC ---

io.on("connection", (socket) => {
  
  // 1. LOGIN
  socket.on("login", async ({ userId }) => {
    onlineUsers[userId] = socket.id;
    socket.userId = userId;
    
    const userGroups = await Group.find({ members: userId });
    if(userGroups.length > 0) {
        userGroups.forEach(group => {
            socket.join(group._id.toString());
        });
    }
    io.emit("user_list", Object.keys(onlineUsers));
  });

  // 2. CALL LOGIC (Imported Handler)
  // This connects the 'callUser', 'answerCall', 'endCall' events
  callHandler(io, socket, onlineUsers);

  // 3. CHAT LOGIC
  socket.on("join_group", (groupId) => {
      socket.join(groupId);
  });

  socket.on("private_message", async ({ to, message }) => {
    const sender = socket.userId;
    const receiverSocketId = onlineUsers[to];
    const deliveredTo = receiverSocketId ? [to] : [];
    
    const newMsg = new Message({ 
        sender, 
        receiver: to, 
        message, 
        isGroup: false,
        deliveredTo, 
        readBy: []
    });
    await newMsg.save();
    await newMsg.populate('sender', 'name profilePic');

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_private_message", { ...newMsg._doc });
    }
    socket.emit("message_sent_ack", { msgId: newMsg._id, delivered: !!receiverSocketId });
  });

  socket.on("group_message", async ({ groupId, message }) => {
      const sender = socket.userId;
      const group = await Group.findById(groupId);
      if(!group) return;

      const onlineMembers = group.members.filter(memberId => {
          const mIdStr = memberId.toString();
          return onlineUsers[mIdStr] && mIdStr !== sender;
      });

      const newMsg = new Message({ 
          sender, 
          receiver: groupId, 
          message, 
          isGroup: true,
          deliveredTo: onlineMembers, 
          readBy: []
      });
      await newMsg.save();
      await newMsg.populate('sender', 'name profilePic');
      
      socket.to(groupId).emit("receive_group_message", { ...newMsg._doc });
      socket.emit("message_sent_ack", { msgId: newMsg._id, delivered: onlineMembers.length > 0 });
  });

  socket.on("add_reaction", async ({ msgId, emoji }) => {
    const userId = socket.userId;
    try {
      const msg = await Message.findById(msgId);
      if (!msg) return;

      const existingIndex = msg.reactions.findIndex(r => r.user.toString() === userId);

      if (existingIndex > -1) {
        if (msg.reactions[existingIndex].emoji === emoji) {
          msg.reactions.splice(existingIndex, 1);
        } else {
          msg.reactions[existingIndex].emoji = emoji;
        }
      } else {
        msg.reactions.push({ user: userId, emoji });
      }

      await msg.save();

      if (msg.isGroup) {
          io.to(msg.receiver.toString()).emit("reaction_updated", { msgId, reactions: msg.reactions });
      } else {
          const receiverId = msg.receiver.toString();
          const senderId = msg.sender.toString();
          const receiverSocket = onlineUsers[receiverId];
          const senderSocket = onlineUsers[senderId];

          if (receiverSocket) io.to(receiverSocket).emit("reaction_updated", { msgId, reactions: msg.reactions });
          if (senderSocket) io.to(senderSocket).emit("reaction_updated", { msgId, reactions: msg.reactions });
      }
    } catch (e) { console.error("Reaction Error:", e); }
  });

  socket.on("mark_read", async ({ chatId, isGroup }) => {
      const myId = socket.userId;
      const query = isGroup 
        ? { receiver: chatId, readBy: { $ne: myId } }
        : { sender: chatId, receiver: myId, readBy: { $ne: myId } };

      await Message.updateMany(query, { 
          $addToSet: { readBy: myId, deliveredTo: myId } 
      });

      if(isGroup) {
          io.to(chatId).emit("group_read_update", { chatId, reader: myId });
      } else {
          const senderSocket = onlineUsers[chatId]; 
          if(senderSocket) {
              io.to(senderSocket).emit("private_read_update", { chatId: myId, reader: myId });
          }
      }
  });

  // --- NOTIFY NEW GROUP EVENTS ---
  socket.on("group_updated", ({ groupId }) => {
      // Broadcast to everyone in the group to refresh data
      socket.to(groupId).emit("group_data_updated", { groupId }); 
  });

  socket.on("send_follow_request", ({ target }) => { 
    const targetSocket = onlineUsers[target];
    if (targetSocket) io.to(targetSocket).emit("new_follow_request", { from: socket.userId });
  });

  socket.on("respond_follow_request", ({ target, action }) => { 
    if (action === 'accept') {
      const targetSocket = onlineUsers[target];
      if (targetSocket) io.to(targetSocket).emit("follow_request_accepted", { from: socket.userId });
    }
  });

  socket.on("group_deleted", (groupId) => {
      socket.broadcast.to(groupId).emit("force_group_close", groupId);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      delete onlineUsers[socket.userId];
      io.emit("user_list", Object.keys(onlineUsers));
    }
  });
});

server.listen(port, "0.0.0.0",() => {
  console.log(`Server is running on port http://10.162.6.2:${port}`);
});