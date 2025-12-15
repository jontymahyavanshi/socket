import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
  Container, Typography, TextField, Button, Box, 
  List, ListItem, ListItemButton, ListItemText, Badge, 
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Avatar, 
  Checkbox, ListItemAvatar, Divider, Chip, Menu, MenuItem, ListItemIcon,
  Tooltip, Fab, useMediaQuery, useTheme
} from '@mui/material';

// --- ICONS ---
import AddIcon from '@mui/icons-material/Add'; 
import GroupAddIcon from '@mui/icons-material/GroupAdd'; 
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications'; 
import SendIcon from '@mui/icons-material/Send';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People'; 
import CheckIcon from '@mui/icons-material/Check'; 
import CloseIcon from '@mui/icons-material/Close'; 
import CircleIcon from '@mui/icons-material/Circle'; 
import DeleteIcon from '@mui/icons-material/Delete';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DoneAllIcon from '@mui/icons-material/DoneAll'; 
import DoneIcon from '@mui/icons-material/Done';       
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; 
import ForwardIcon from '@mui/icons-material/Forward';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'; 
import PhoneIcon from '@mui/icons-material/Phone'; 
import VideocamIcon from '@mui/icons-material/Videocam'; 
import CallEndIcon from '@mui/icons-material/CallEnd'; 
import MicIcon from '@mui/icons-material/Mic'; 
import MicOffIcon from '@mui/icons-material/MicOff'; 
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// New Icon for removing users
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

// --- NEW ICONS FOR GROUP DETAILS ---
import EditIcon from '@mui/icons-material/Edit';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';

import EmojiPicker from 'emoji-picker-react'; 
import { io } from "socket.io-client";
import SimplePeer from "simple-peer"; 
import ProfileSettings from "./ProfileSettings"; 

// --- HELPER COMPONENT: VIDEO PLAYER ---
const VideoPlayer = ({ stream, isLocal = false }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      playsInline
      ref={videoRef}
      autoPlay
      muted={isLocal} 
      style={{
        width: isLocal ? '150px' : '100%',
        height: isLocal ? 'auto' : '100%',
        borderRadius: 10,
        objectFit: 'cover',
        border: isLocal ? '2px solid white' : 'none',
        position: isLocal ? 'absolute' : 'relative',
        bottom: isLocal ? 20 : undefined,
        right: isLocal ? 20 : undefined,
        transform: isLocal ? 'scaleX(-1)' : 'none', 
        zIndex: isLocal ? 2 : 1,
        boxShadow: isLocal ? '0 4px 10px rgba(0,0,0,0.3)' : 'none'
      }}
    />
  );
};

const formatTime = (dateInput) => {
  const date = new Date(dateInput);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const MessageStatus = ({ msg, currentGroup }) => {
  if (!msg.deliveredTo || msg.deliveredTo.length === 0) return <DoneIcon sx={{ fontSize: 16, color: '#888' }} />;
  let isRead = false, isDelivered = false;
  if (currentGroup) {
    const totalMembers = currentGroup.members.length - 1; 
    const readCount = msg.readBy ? msg.readBy.length : 0;
    const deliveredCount = msg.deliveredTo ? msg.deliveredTo.length : 0;
    isRead = readCount >= totalMembers && totalMembers > 0;
    isDelivered = deliveredCount >= totalMembers;
  } else {
    isRead = msg.readBy && msg.readBy.length > 0;
    isDelivered = true; 
  }
  if (isRead) return <DoneAllIcon sx={{ fontSize: 16, color: '#34b7f1' }} />;
  if (isDelivered) return <DoneAllIcon sx={{ fontSize: 16, color: '#888' }} />;
  return <DoneIcon sx={{ fontSize: 16, color: '#888' }} />;
};

const Chat = ({ user, onLogout, onUpdateUser }) => {
  const socket = useMemo(() => io("http://localhost:5000", { autoConnect: false }), []);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- STATE ---
  const [onlineUsers, setOnlineUsers] = useState([]); 
  const [selectedChatId, setSelectedChatId] = useState(null); 
  const [selectedChatName, setSelectedChatName] = useState(""); 
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState({}); 
  const [unreadCounts, setUnreadCounts] = useState({});
  const [allUsers, setAllUsers] = useState([]); 
  const [following, setFollowing] = useState([]); 
  const [followRequests, setFollowRequests] = useState([]); 
  const [groups, setGroups] = useState([]); 

  // Modals & UI
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [msgToForward, setMsgToForward] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]); 

  // Group Details States
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMembersToAdd, setNewMembersToAdd] = useState([]);
  const fileInputRef = useRef(null);

  // Call States
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null); 
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [nameToCall, setNameToCall] = useState("");
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const connectionRef = useRef();
  const selectedChatIdRef = useRef(selectedChatId);
  const scrollRef = useRef(null); 

  const currentGroup = groups.find(g => g._id === selectedChatId);

  // Helper to check if current logged in user is admin of the current group
  const amIAdmin = currentGroup?.admin === user._id;

  useEffect(() => {
    if (currentGroup) setTempGroupName(currentGroup.name);
  }, [currentGroup]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
    if (selectedChatId) setUnreadCounts((prev) => ({ ...prev, [selectedChatId]: 0 }));
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatId, chats]);

  useEffect(() => {
    socket.connect();
    socket.emit("login", { userId: user._id });

    fetch(`http://localhost:5000/user/${user._id}`).then(res => res.json()).then(data => {
        if (data) {
          setFollowing(data.following || []);
          setFollowRequests(data.followRequests || []);
        }
      });
    fetch(`http://localhost:5000/groups/${user._id}`).then(res => res.json()).then(data => setGroups(data || []));

    socket.on("user_list", (userIds) => setOnlineUsers(userIds));
    socket.on("receive_private_message", handleNewMessage);
    socket.on("receive_group_message", handleNewMessage);
    socket.on("reaction_updated", handleReactionUpdate);
    socket.on("private_read_update", handleReadUpdate);
    socket.on("group_read_update", handleReadUpdate);
    socket.on("message_sent_ack", ({ msgId, delivered }) => {});
    
    socket.on("new_follow_request", () => {
        fetch(`http://localhost:5000/user/${user._id}`).then(res => res.json()).then(data => setFollowRequests(data.followRequests || []));
    });
    socket.on("follow_request_accepted", () => {
      fetch(`http://localhost:5000/user/${user._id}`).then(res => res.json()).then(data => setFollowing(data.following || []));
      alert("Request accepted!");
    });
    socket.on("force_group_close", (groupId) => {
        setGroups(prev => prev.filter(g => g._id !== groupId));
        if (selectedChatIdRef.current === groupId) { setSelectedChatId(null); alert("This group was deleted by the admin."); }
    });
    socket.on("group_data_updated", ({ groupId }) => {
        fetch(`http://localhost:5000/groups/${user._id}`).then(res => res.json()).then(data => setGroups(data || []));
    });

    socket.on("callUser", (data) => {
        setReceivingCall(true);
        setCaller(data.from);
        setNameToCall(data.name);
        setCallerSignal(data.signal);
    });
    socket.on("callEnded", () => {
        setCallEnded(true);
        leaveCall();
    });

    return () => { socket.disconnect(); socket.off(); };
  }, [user._id, socket]);

  // --- CALLING LOGIC ---
  const callUser = (id, video = true) => {
    setIsVideoCall(video); setCallEnded(false); setCallAccepted(false); setIdToCall(id);
    navigator.mediaDevices.getUserMedia({ video: video, audio: true }).then((currentStream) => {
        setStream(currentStream);
        const peer = new SimplePeer({ initiator: true, trickle: false, stream: currentStream });
        peer.on("signal", (data) => { socket.emit("callUser", { userToCall: id, signalData: data, from: user._id, name: user.name }); });
        peer.on("stream", (currentRemoteStream) => { setRemoteStream(currentRemoteStream); });
        socket.on("callAccepted", (signal) => { setCallAccepted(true); peer.signal(signal); });
        connectionRef.current = peer;
    }).catch((err) => { alert(`Error accessing media: ${err.name}`); });
  };

  const answerCall = () => {
    setCallAccepted(true); setIsVideoCall(true);
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
        setStream(currentStream);
        const peer = new SimplePeer({ initiator: false, trickle: false, stream: currentStream });
        peer.on("signal", (data) => { socket.emit("answerCall", { signal: data, to: caller }); });
        peer.on("stream", (currentRemoteStream) => { setRemoteStream(currentRemoteStream); });
        peer.signal(callerSignal);
        connectionRef.current = peer;
    }).catch((err) => { alert(`Error: ${err.message}`); });
  };

  const leaveCall = () => {
    setCallEnded(true);
    if(connectionRef.current) connectionRef.current.destroy();
    if (stream) { stream.getTracks().forEach(track => track.stop()); }
    setStream(null); setRemoteStream(null); setReceivingCall(false); setCallAccepted(false);
    const target = receivingCall ? caller : idToCall;
    if(target) socket.emit("endCall", { to: target });
  };

  const toggleMute = () => { if(stream) { const audioTrack = stream.getAudioTracks()[0]; if(audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(!audioTrack.enabled); }}}

  // --- HELPER LOGIC ---
  const handleNewMessage = (newMsg) => {
      let chatId, text;
      if(newMsg.isGroup) {
          chatId = newMsg.receiver;
          const senderName = typeof newMsg.sender === 'object' ? newMsg.sender.name : "Member";
          text = `${senderName}: ${newMsg.message}`;
      } else {
          const senderId = typeof newMsg.sender === 'object' ? newMsg.sender._id : newMsg.sender;
          chatId = senderId === user._id ? newMsg.receiver : senderId;
          text = newMsg.message;
      }
      const senderId = typeof newMsg.sender === 'object' ? newMsg.sender._id : newMsg.sender;
      const isMe = senderId === user._id;
      const isCurrentChat = selectedChatIdRef.current === chatId;
      const formattedMsg = { _id: newMsg._id, text: text, isMe: isMe, time: formatTime(newMsg.timestamp), reactions: newMsg.reactions || [] };
      if (isCurrentChat) socket.emit("mark_read", { chatId: chatId, isGroup: newMsg.isGroup });
      setChats(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), formattedMsg] }));
      if (!isCurrentChat) setUnreadCounts(prev => ({...prev, [chatId]: (prev[chatId] || 0) + 1 }));
  };

  const handleReactionUpdate = ({ msgId, reactions }) => {
      setChats(prev => {
          const newChats = { ...prev };
          Object.keys(newChats).forEach(chatId => {
              newChats[chatId] = newChats[chatId].map(msg => { if (msg._id === msgId) return { ...msg, reactions: reactions }; return msg; });
          }); return newChats;
      });
  };

  const handleReadUpdate = ({ chatId, reader }) => {
      setChats(prev => {
          const chatMessages = prev[chatId] || [];
          const updatedMessages = chatMessages.map(msg => {
              if (msg.isMe && !msg.readBy?.includes(reader)) { return { ...msg, readBy: [...(msg.readBy || []), reader], deliveredTo: [...(msg.deliveredTo || []), reader] }; }
              return msg;
          }); return { ...prev, [chatId]: updatedMessages };
      });
  };

  const getActiveChatAvatar = () => { if (currentGroup) return currentGroup.groupPic || null; const friend = following.find(f => f._id === selectedChatId); return friend ? friend.profilePic : null; };
  const getMemberData = (id) => { if (id === user._id) return { name: "You", pic: user.profilePic }; const friend = following.find(f => f._id === id); return friend ? { name: friend.name, pic: friend.profilePic } : { name: "Unknown", pic: null }; };
  
  // --- UI HANDLERS ---
  const handleSend = (e) => {
    e.preventDefault(); if (!message || !selectedChatId) return; setShowEmojiPicker(false); 
    const isGroupChat = groups.some(g => g._id === selectedChatId);
    const now = new Date(); 
    const optimisticMsg = { text: isGroupChat ? `Me: ${message}` : message, isMe: true, time: formatTime(now), deliveredTo: [], readBy: [], reactions: [] };
    if (isGroupChat) socket.emit("group_message", { groupId: selectedChatId, message });
    else socket.emit("private_message", { to: selectedChatId, message });
    setChats(prev => ({ ...prev, [selectedChatId]: [...(prev[selectedChatId] || []), optimisticMsg] }));
    setMessage("");
  };
  const handleEmojiClick = (e) => setMessage(prev => prev + e.emoji);
  const handleSelectChat = async (id, name, isGroup) => {
    setSelectedChatId(id); setSelectedChatName(name); socket.emit("mark_read", { chatId: id, isGroup });
    const url = isGroup ? `http://localhost:5000/group-messages/${id}` : `http://localhost:5000/messages?sender=${user._id}&receiver=${id}`;
    try {
      const res = await fetch(url); const data = await res.json();
      const history = data.map(msg => {
          const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
          const senderName = typeof msg.sender === 'object' ? msg.sender.name : 'User';
          return { _id: msg._id, text: isGroup ? (senderId === user._id ? `Me: ${msg.message}` : `${senderName}: ${msg.message}`) : msg.message, isMe: senderId === user._id, time: formatTime(msg.timestamp), deliveredTo: msg.deliveredTo || [], readBy: msg.readBy || [], reactions: msg.reactions || [] }
      });
      setChats(prev => ({ ...prev, [id]: history })); setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
    } catch (e) {}
  };
  const renderReactions = (reactions) => { if (!reactions || reactions.length === 0) return null; const counts = {}; reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; }); return ( <Box sx={{ position: 'absolute', bottom: -10, right: 10, bgcolor: 'white', borderRadius: 5, boxShadow: 2, px: 0.8, py: 0.2, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', border: '1px solid #e0e0e0', zIndex: 1 }}> {Object.keys(counts).map(emoji => ( <span key={emoji}>{emoji} {counts[emoji] > 1 ? counts[emoji] : ''}</span> ))} </Box> ); };
  const handleReact = (emoji) => { if (!contextMenu?.msg?._id) return; socket.emit("add_reaction", { msgId: contextMenu.msg._id, emoji }); setContextMenu(null); };
  
  // Update Group Logic
  const handleUpdateGroupName = async () => {
    if (!tempGroupName.trim() || tempGroupName === currentGroup.name) { setIsEditingGroupName(false); return; }
    try {
        const res = await fetch("http://localhost:5000/update-group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: selectedChatId, newName: tempGroupName }) });
        const data = await res.json();
        if (data.success) { setGroups(prev => prev.map(g => g._id === selectedChatId ? { ...g, name: tempGroupName } : g)); setIsEditingGroupName(false); socket.emit("group_updated", { groupId: selectedChatId }); }
    } catch (err) { alert("Failed to update name"); }
  };
  const handleGroupPhotoChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append("image", file); formData.append("groupId", selectedChatId);
    try {
        const res = await fetch("http://localhost:5000/upload-group-icon", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) { setGroups(prev => prev.map(g => g._id === selectedChatId ? { ...g, groupPic: data.url } : g)); socket.emit("group_updated", { groupId: selectedChatId }); }
    } catch (err) { alert("Failed to upload image"); }
  };
  const handleAddParticipants = async () => {
      if(newMembersToAdd.length === 0) return;
      try {
          const res = await fetch("http://localhost:5000/add-group-member", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: selectedChatId, members: newMembersToAdd }) });
          const data = await res.json();
          if(data.success) { setGroups(prev => prev.map(g => g._id === selectedChatId ? data.group : g)); setIsAddMemberModalOpen(false); setNewMembersToAdd([]); socket.emit("group_updated", { groupId: selectedChatId }); }
      } catch (err) { alert("Failed to add members"); }
  };
  
  // 1. Remove Member Logic (New)
  const handleRemoveMember = async (memberId) => {
      if(!window.confirm("Remove this user from the group?")) return;
      try {
          // Re-using leave-group endpoint but sending the specific memberId
          const res = await fetch("http://localhost:5000/leave-group", { 
              method: "POST", 
              headers: { "Content-Type": "application/json" }, 
              body: JSON.stringify({ groupId: selectedChatId, userId: memberId }) 
          });
          if(res.ok) {
              setGroups(prev => prev.map(g => {
                  if(g._id === selectedChatId) {
                      return { ...g, members: g.members.filter(m => m !== memberId) };
                  }
                  return g;
              }));
              socket.emit("group_updated", { groupId: selectedChatId });
          }
      } catch (err) { alert("Failed to remove member"); }
  };

  const toggleNewMember = (id) => { newMembersToAdd.includes(id) ? setNewMembersToAdd(prev => prev.filter(m => m !== id)) : setNewMembersToAdd(prev => [...prev, id]); };

  // Common Dialog Logic
  const handleLeaveGroup = async () => { if(!selectedChatId) return; if(!window.confirm("Leave group?")) return; const res = await fetch("http://localhost:5000/leave-group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: selectedChatId, userId: user._id }) }); if(res.ok) { setGroups(prev => prev.filter(g => g._id !== selectedChatId)); setSelectedChatId(null); setIsGroupInfoOpen(false); } };
  const handleDeleteGroup = async () => { if(!selectedChatId) return; if(!window.confirm("Delete group?")) return; const res = await fetch("http://localhost:5000/delete-group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: selectedChatId, userId: user._id }) }); if(res.ok) { socket.emit("group_deleted", selectedChatId); setGroups(prev => prev.filter(g => g._id !== selectedChatId)); setSelectedChatId(null); setIsGroupInfoOpen(false); } };
  const handleCreateGroup = async () => { if (!newGroupName || newGroupMembers.length === 0) return alert("Add name and members"); const res = await fetch("http://localhost:5000/create-group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newGroupName, members: newGroupMembers, admin: user._id }) }); const data = await res.json(); if (data.success) { setGroups(prev => [...prev, data.group]); setIsGroupModalOpen(false); setNewGroupName(""); setNewGroupMembers([]); socket.emit("join_group", data.group._id); } };
  const handleSendRequest = async (targetId) => { const res = await fetch("http://localhost:5000/request-follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sender: user._id, target: targetId }) }); const data = await res.json(); if (data.success) { socket.emit("send_follow_request", { target: targetId }); alert("Request Sent!"); setIsFindModalOpen(false); } else { alert(data.message || data.error); } };
  const handleRespondRequest = async (requesterId, action) => { const res = await fetch("http://localhost:5000/respond-follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ myId: user._id, requesterId, action }) }); const data = await res.json(); if (data.success) { setFollowRequests(data.requests); setFollowing(data.following); socket.emit("respond_follow_request", { target: requesterId, action }); } };
  const handleOpenFindUsers = async () => { setIsFindModalOpen(true); const res = await fetch("http://localhost:5000/users"); const data = await res.json(); setAllUsers(data.filter(u => u._id !== user._id)); };
  const toggleGroupMember = (friendId) => { newGroupMembers.includes(friendId) ? setNewGroupMembers(prev => prev.filter(m => m !== friendId)) : setNewGroupMembers(prev => [...prev, friendId]); };
  
  // Context Menus
  const handleContextMenu = (e, msg) => { e.preventDefault(); setContextMenu(contextMenu === null ? { mouseX: e.clientX + 2, mouseY: e.clientY - 6, msg } : null); };
  const handleCloseContextMenu = () => setContextMenu(null);
  const handleCopy = () => { if(contextMenu?.msg?.text) navigator.clipboard.writeText(contextMenu.msg.text); handleCloseContextMenu(); };
  const handleDeleteMessage = async () => { if(!contextMenu?.msg?._id) return handleCloseContextMenu(); const msgId = contextMenu.msg._id; setChats(prev => ({ ...prev, [selectedChatId]: prev[selectedChatId].filter(m => m._id !== msgId) })); await fetch("http://localhost:5000/delete-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msgId }) }); handleCloseContextMenu(); };
  const handleForwardInit = () => { setMsgToForward(contextMenu.msg); setIsForwardModalOpen(true); handleCloseContextMenu(); };
  const handleForwardSend = (targetId) => { const isGroup = groups.some(g => g._id === targetId); let rawText = msgToForward.text; if(rawText.includes(": ")) rawText = rawText.split(": ")[1]; if (isGroup) { socket.emit("group_message", { groupId: targetId, message: rawText }); } else { socket.emit("private_message", { to: targetId, message: rawText }); const now = new Date(); const optimisticMsg = { text: rawText, isMe: true, time: formatTime(now), deliveredTo: [], readBy: [], reactions: [] }; setChats(prev => ({ ...prev, [targetId]: [...(prev[targetId] || []), optimisticMsg] })); } alert("Message Forwarded!"); setIsForwardModalOpen(false); setMsgToForward(null); };

  // --- RENDER ---
  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh', bgcolor: '#d1d7db', position: 'relative' }}> 
      <Box sx={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
        
        {/* SIDEBAR: Hidden on mobile when chat is selected */}
        <Box sx={{ 
            width: { xs: '100%', md: '30%' }, 
            minWidth: { md: '320px' },
            borderRight: '1px solid #ddd', 
            bgcolor: 'white', 
            display: { xs: selectedChatId ? 'none' : 'flex', md: 'flex' }, 
            flexDirection: 'column' 
        }}>
          <Box p={2} sx={{ bgcolor: '#f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
             <Tooltip title="Your Profile" arrow>
                 <Box display="flex" alignItems="center" gap={1} onClick={() => setIsProfileOpen(true)} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                    <Avatar src={user.profilePic} sx={{ bgcolor: '#dfe1e5' }}>{!user.profilePic && <AccountCircleIcon />}</Avatar>
                    <Typography variant="subtitle2" fontWeight="bold">{user.name}</Typography>
                 </Box>
             </Tooltip>
             <Box>
                <Tooltip title="Follow Requests" arrow><IconButton onClick={() => setIsRequestModalOpen(true)}><Badge badgeContent={followRequests.length} color="error"><NotificationsIcon /></Badge></IconButton></Tooltip>
                <Tooltip title="New Group" arrow><IconButton onClick={() => setIsGroupModalOpen(true)}><GroupAddIcon /></IconButton></Tooltip>
                <Tooltip title="Find People" arrow><IconButton onClick={handleOpenFindUsers}><AddIcon /></IconButton></Tooltip>
                <Tooltip title="Logout" arrow><IconButton onClick={onLogout}><LogoutIcon/></IconButton></Tooltip>
             </Box>
          </Box>
          <Divider />
          <List sx={{ overflowY: 'auto', flexGrow: 1, bgcolor: 'white' }}>
            {groups.length > 0 && (<><Typography variant="caption" sx={{ pl: 2, pt: 1, color: '#666', fontWeight: 'bold' }}>GROUPS</Typography>{groups.map((group) => (<ListItemButton key={group._id} selected={selectedChatId === group._id} onClick={() => handleSelectChat(group._id, group.name, true)} sx={{ '&.Mui-selected': { bgcolor: '#f0f2f5' } }}><Avatar sx={{ mr: 2, bgcolor: '#008069' }}><PeopleIcon /></Avatar><ListItemText primary={group.name} /><Badge color="success" badgeContent={unreadCounts[group._id] || 0} /></ListItemButton>))}<Divider sx={{ my: 1 }} /></>)}
            <Typography variant="caption" sx={{ pl: 2, pt: 1, color: '#666', fontWeight: 'bold' }}>FRIENDS</Typography>
            {following.map((friend) => (<ListItemButton key={friend._id} selected={selectedChatId === friend._id} onClick={() => handleSelectChat(friend._id, friend.name, false)} sx={{ '&.Mui-selected': { bgcolor: '#f0f2f5' } }}><Avatar src={friend.profilePic} sx={{ mr: 2 }} /><ListItemText primary={friend.name} secondary={onlineUsers.includes(friend._id) ? "Online" : "Offline"} />{onlineUsers.includes(friend._id) && <CircleIcon sx={{fontSize: 10, color: '#25d366'}}/>}<Badge color="success" badgeContent={unreadCounts[friend._id] || 0} sx={{ml:1}} /></ListItemButton>))}
          </List>
        </Box>

        {/* CHAT AREA: Full width on mobile when chat is selected */}
        <Box sx={{ 
            width: { xs: '100%', md: '70%' }, 
            display: { xs: selectedChatId ? 'flex' : 'none', md: 'flex' }, 
            flexDirection: 'column', 
            bgcolor: '#efeae2' 
        }}>
          {selectedChatId ? (
            <>
              {/* HEADER */}
              <Box px={2} sx={{ bgcolor: '#f0f2f5', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '1px solid #ddd' }}>
                <Box display="flex" alignItems="center">
                    <IconButton sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} onClick={() => setSelectedChatId(null)}> <ArrowBackIcon /> </IconButton>
                    <Box display="flex" alignItems="center" onClick={() => currentGroup && setIsGroupInfoOpen(true)} sx={{ cursor: currentGroup ? 'pointer' : 'default' }}>
                        <Avatar src={getActiveChatAvatar()} sx={{ mr: 2 }}>{currentGroup ? <PeopleIcon /> : null}</Avatar>
                        <Box sx={{ overflow: 'hidden' }}>
                            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{selectedChatName}</Typography>
                            {currentGroup && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{currentGroup.members.length} participants</Typography>}
                        </Box>
                    </Box>
                </Box>
                {/* --- CALL ICONS --- */}
                {!currentGroup && (
                    <Box>
                        <Tooltip title="Voice Call"><IconButton onClick={() => callUser(selectedChatId, false)}><PhoneIcon /></IconButton></Tooltip>
                        <Tooltip title="Video Call"><IconButton onClick={() => callUser(selectedChatId, true)}><VideocamIcon /></IconButton></Tooltip>
                    </Box>
                )}
              </Box>
              
              {/* MESSAGES */}
              <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {chats[selectedChatId]?.map((msg, index) => (
                    <Box key={index} onContextMenu={(e) => handleContextMenu(e, msg)} sx={{ alignSelf: msg.isMe ? 'flex-end' : 'flex-start', maxWidth: '60%', display: 'flex', flexDirection: 'column', alignItems: msg.isMe ? 'flex-end' : 'flex-start' }}>
                      <Box sx={{ bgcolor: msg.isMe ? '#d9fdd3' : 'white', p: 1, px: 2, borderRadius: 2, boxShadow: 1, position: 'relative', mb: msg.reactions && msg.reactions.length > 0 ? 1.5 : 0 }}>
                        <Typography variant="body1">{msg.text}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666' }}>{msg.time}</Typography>
                            {msg.isMe && <MessageStatus msg={msg} currentGroup={currentGroup} />}
                        </Box>
                        {renderReactions(msg.reactions)}
                      </Box>
                    </Box>
                ))}
                <div ref={scrollRef} />
              </Box>

              {/* INPUT */}
              <Box component="form" onSubmit={handleSend} sx={{ p: 1.5, bgcolor: '#f0f2f5', display: 'flex', gap: 1, alignItems: 'center', position: 'relative' }}>
                {showEmojiPicker && (<Box sx={{ position: 'absolute', bottom: '70px', left: '10px', zIndex: 10 }}><EmojiPicker onEmojiClick={handleEmojiClick} /></Box>)}
                <Tooltip title="Emoji" arrow><IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}><EmojiEmotionsIcon /></IconButton></Tooltip>
                <TextField fullWidth size="small" placeholder="Message..." value={message} onChange={(e) => setMessage(e.target.value)} sx={{ bgcolor: 'white' }} />
                <Tooltip title="Send" arrow><IconButton type="submit"><SendIcon /></IconButton></Tooltip>
              </Box>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#888' }}><Typography variant="h5">Whatsapp++</Typography><Typography>Select a contact or group to chat</Typography></Box>
          )}
        </Box>
      </Box>

      {/* --- CALL MODAL (OVERLAY) --- */}
      {(stream || receivingCall) && !callEnded && (
          <Dialog open={true} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#202124', color: 'white', height: '80vh' } }}>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  {receivingCall && !callAccepted ? `Incoming call from ${nameToCall}` : `Call with ${selectedChatName}`}
              </DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' }}>
                  
                  {callAccepted && !callEnded && (<VideoPlayer stream={remoteStream} />)}
                  {stream && isVideoCall && (<VideoPlayer stream={stream} isLocal={true} />)}
                  {!isVideoCall && (<Avatar sx={{ width: 100, height: 100, bgcolor: '#008069', fontSize: 40 }}><PersonIcon fontSize="inherit"/></Avatar>)}

                  {receivingCall && !callAccepted && (
                      <Box display="flex" gap={3} mt={4}>
                          <Fab color="success" onClick={answerCall}><PhoneIcon /></Fab>
                          <Fab color="error" onClick={leaveCall}><CallEndIcon /></Fab>
                      </Box>
                  )}
              </DialogContent>
              <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
                  {callAccepted && ( <> <Fab color={isMuted ? "default" : "primary"} onClick={toggleMute}>{isMuted ? <MicOffIcon /> : <MicIcon />}</Fab> <Fab color="error" onClick={leaveCall}><CallEndIcon /></Fab> </> )}
                  {!callAccepted && !receivingCall && (<Button variant="contained" color="error" startIcon={<CallEndIcon />} onClick={leaveCall}>Cancel</Button>)}
              </DialogActions>
          </Dialog>
      )}

      {/* --- OTHER MODALS --- */}
      <ProfileSettings open={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onUpdateUser={onUpdateUser} />
      
      <Menu open={contextMenu !== null} onClose={() => setContextMenu(null)} anchorReference="anchorPosition" anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}>
        <MenuItem sx={{ display: 'flex', gap: 1 }}>{['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (<span key={emoji} onClick={() => handleReact(emoji)} style={{ fontSize: '1.2rem', cursor: 'pointer' }}>{emoji}</span>))}</MenuItem>
        <Divider />
        <MenuItem onClick={handleCopy}><ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon><ListItemText>Copy</ListItemText></MenuItem>
        <MenuItem onClick={handleForwardInit}><ListItemIcon><ForwardIcon fontSize="small" /></ListItemIcon><ListItemText>Forward</ListItemText></MenuItem>
        <MenuItem onClick={handleDeleteMessage}><ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon><ListItemText>Delete</ListItemText></MenuItem>
      </Menu>

      <Dialog open={isFindModalOpen} onClose={() => setIsFindModalOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Find People</DialogTitle><DialogContent dividers><List>{allUsers.map((u) => (<ListItem key={u._id}><Avatar src={u.profilePic} sx={{mr:2}}/><ListItemText primary={u.name} />{following.some(f=>f._id===u._id)?<Button disabled>Added</Button>:<Button onClick={()=>handleSendRequest(u._id)}>Follow</Button>}</ListItem>))}</List></DialogContent><DialogActions><Button onClick={()=>setIsFindModalOpen(false)}>Close</Button></DialogActions></Dialog>
      <Dialog open={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Follow Requests</DialogTitle><DialogContent dividers><List>{followRequests.map((req) => (<ListItem key={req._id}><Avatar src={req.profilePic} sx={{mr:2}}/><ListItemText primary={req.name} /><IconButton onClick={()=>handleRespondRequest(req._id,'accept')}><CheckIcon/></IconButton><IconButton onClick={()=>handleRespondRequest(req._id,'reject')}><CloseIcon/></IconButton></ListItem>))}</List></DialogContent><DialogActions><Button onClick={()=>setIsRequestModalOpen(false)}>Close</Button></DialogActions></Dialog>
      <Dialog open={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Create Group</DialogTitle><DialogContent dividers><TextField fullWidth label="Name" value={newGroupName} onChange={(e)=>setNewGroupName(e.target.value)}/><List>{following.map(f=>(<ListItem key={f._id} button onClick={()=>toggleGroupMember(f._id)}><ListItemAvatar><Avatar src={f.profilePic}/></ListItemAvatar><ListItemText primary={f.name}/><Checkbox checked={newGroupMembers.includes(f._id)}/></ListItem>))}</List></DialogContent><DialogActions><Button onClick={()=>handleCreateGroup()}>Create</Button><Button onClick={()=>setIsGroupModalOpen(false)}>Cancel</Button></DialogActions></Dialog>
      <Dialog open={isForwardModalOpen} onClose={() => setIsForwardModalOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Forward To</DialogTitle><DialogContent dividers><List>{[...groups, ...following].map(Target=>(<ListItem button onClick={()=>handleForwardSend(Target._id)}><Avatar src={Target.profilePic}/><ListItemText primary={Target.name}/></ListItem>))}</List></DialogContent><DialogActions><Button onClick={()=>setIsForwardModalOpen(false)}>Cancel</Button></DialogActions></Dialog>
      
      {/* --- NEW MODERN GROUP INFO DIALOG --- */}
      <Dialog 
        open={isGroupInfoOpen} 
        onClose={() => { setIsGroupInfoOpen(false); setIsEditingGroupName(false); }} 
        fullWidth 
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 4, bgcolor: '#f0f2f5', height: '80vh', overflow: 'hidden' } }}
      >
        <Box sx={{ bgcolor: 'white', pb: 3, pt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 1, position: 'relative' }}>
          <IconButton onClick={() => setIsGroupInfoOpen(false)} sx={{ position: 'absolute', left: 10, top: 10, color: '#54656f' }}> <CloseIcon /> </IconButton>
          <Box sx={{ position: 'relative' }}>
            <Avatar src={currentGroup?.groupPic} sx={{ width: 120, height: 120, bgcolor: '#008069', fontSize: 50, boxShadow: 3 }}> <PeopleIcon fontSize="inherit" /> </Avatar>
            {/* Only admin can change photo */}
            {amIAdmin && (
              <>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleGroupPhotoChange} />
                <Fab size="small" color="secondary" onClick={() => fileInputRef.current.click()} sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: '#00a884' }}> <CameraAltIcon /> </Fab>
              </>
            )}
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center', px: 3, width: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
              {isEditingGroupName ? (
                  <Box display="flex" alignItems="center" gap={1}>
                      <TextField autoFocus size="small" value={tempGroupName} onChange={(e) => setTempGroupName(e.target.value)} sx={{ input: { textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem' } }} />
                      <IconButton onClick={handleUpdateGroupName} color="primary"><CheckIcon /></IconButton>
                      <IconButton onClick={() => setIsEditingGroupName(false)} color="error"><CloseIcon /></IconButton>
                  </Box>
              ) : (
                  <>
                    <Typography variant="h5" fontWeight="bold" color="#111b21"> {currentGroup?.name} </Typography>
                    {amIAdmin && (
                      <IconButton size="small" onClick={() => setIsEditingGroupName(true)}> <EditIcon fontSize="small" /> </IconButton>
                    )}
                  </>
              )}
            </Box>
            <Typography variant="body2" color="#54656f"> Group · {currentGroup?.members.length} participants </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
          <Box sx={{ bgcolor: 'white', mt: 1, p: 2, boxShadow: 1 }}>
            <Typography variant="body2" color="#008069" fontWeight="bold">Description</Typography>
            <Typography variant="body2" color="#3b4a54" sx={{ mt: 1 }}> Welcome to the group! 🚀 </Typography>
          </Box>
          <Box sx={{ bgcolor: 'white', mt: 1, boxShadow: 1, pb: 2 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="#54656f" fontWeight="bold"> {currentGroup?.members.length} MEMBERS </Typography>
              <SearchIcon sx={{ color: '#54656f' }} />
            </Box>
            <List disablePadding>
              {/* Only show "Add Participants" if current user is Admin */}
              {amIAdmin && (
                <ListItemButton onClick={() => setIsAddMemberModalOpen(true)}>
                   <ListItemAvatar> <Avatar sx={{ bgcolor: '#008069' }}><GroupAddIcon /></Avatar> </ListItemAvatar>
                   <ListItemText primary="Add Participants" />
                </ListItemButton>
              )}

              {currentGroup?.members.map((mId) => {
                const memberData = getMemberData(mId);
                const isAdmin = currentGroup?.admin === mId; 
                const isMe = mId === user._id;
                return (
                  <ListItem 
                    key={mId} 
                    divider 
                    sx={{ pl: 3 }}
                    secondaryAction={
                      // 2. Remove Member Logic: Only show for Admin, and don't allow removing self here
                      amIAdmin && !isMe ? (
                        <IconButton edge="end" onClick={() => handleRemoveMember(mId)}>
                          <PersonRemoveIcon color="error" />
                        </IconButton>
                      ) : null
                    }
                  >
                    <ListItemAvatar> <Avatar src={memberData.pic} /> </ListItemAvatar>
                    <ListItemText primary={<Box display="flex" alignItems="center" gap={1}> <Typography fontWeight={isMe ? "bold" : "normal"}> {memberData.name} {isMe && "(You)"} </Typography> {isAdmin && (<Chip label="Group Admin" size="small" variant="outlined" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />)} </Box>} secondary={isAdmin ? "Created this group" : "Hey there! I am using WhatsApp++"} />
                  </ListItem>
                );
              })}
            </List>
          </Box>
          <Box sx={{ bgcolor: 'white', mt: 1, mb: 4, boxShadow: 1 }}>
            <ListItemButton onClick={handleLeaveGroup}>
              <ListItemIcon><ExitToAppIcon color="error" /></ListItemIcon>
              <ListItemText primary="Exit Group" primaryTypographyProps={{ color: 'error', fontWeight: 'bold' }} />
            </ListItemButton>
            {/* Delete group button strictly for Admin */}
            {amIAdmin && (
              <ListItemButton onClick={handleDeleteGroup}>
                <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
                <ListItemText primary="Delete Group" primaryTypographyProps={{ color: 'error', fontWeight: 'bold' }} />
              </ListItemButton>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* --- NEW MODAL: ADD PARTICIPANTS TO EXISTING GROUP --- */}
      <Dialog open={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add to {currentGroup?.name}</DialogTitle>
        <DialogContent dividers>
            <List>
                {following.filter(f => !currentGroup?.members.includes(f._id)).length > 0 ? (
                    following.filter(f => !currentGroup?.members.includes(f._id)).map(f => (
                            <ListItem key={f._id} button onClick={() => toggleNewMember(f._id)}>
                                <ListItemAvatar><Avatar src={f.profilePic}/></ListItemAvatar>
                                <ListItemText primary={f.name} />
                                <Checkbox checked={newMembersToAdd.includes(f._id)} />
                            </ListItem>
                        ))
                ) : ( <Typography p={2} align="center" color="text.secondary">No new friends to add</Typography> )}
            </List>
        </DialogContent>
        <DialogActions> <Button onClick={() => setIsAddMemberModalOpen(false)}>Cancel</Button> <Button onClick={handleAddParticipants} variant="contained" disabled={newMembersToAdd.length === 0}>Add</Button> </DialogActions>
      </Dialog>

    </Container>
  );
};

export default Chat;