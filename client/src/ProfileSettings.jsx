import React, { useState, useRef } from "react";
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Box, Avatar, Typography, IconButton, Badge
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import CameraAltIcon from '@mui/icons-material/CameraAlt'; 

const ProfileSettings = ({ open, onClose, user, onUpdateUser }) => {
  const [name, setName] = useState(user.name || "");
  const [about, setAbout] = useState(user.about || "");
  
  // State for immediate UI preview (shows existing pic OR selected new pic)
  const [preview, setPreview] = useState(user.profilePic || ""); 
  // State to hold the actual file object for uploading
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null); 

  // --- 1. HANDLE IMAGE SELECTION ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file); // Store file for upload later
      setPreview(URL.createObjectURL(file)); // Create a temporary local preview URL
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let finalProfilePic = user.profilePic; // Default to existing pic

      // --- 2. UPLOAD IMAGE (If a new one was selected) ---
      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile); // Key 'image' must match server's upload.single('image')

        // A. Upload File to Server
        const uploadRes = await fetch("http://localhost:5000/upload", {
          method: "POST",
          body: formData, // Send as FormData (not JSON)
        });
        
        if (!uploadRes.ok) throw new Error("Image upload failed");
        
        const uploadData = await uploadRes.json();
        finalProfilePic = uploadData.imageUrl; // Get the returned URL
      }

      // --- 3. SAVE PROFILE DATA ---
      const res = await fetch("http://localhost:5000/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            userId: user._id, 
            name, 
            about, 
            profilePic: finalProfilePic // Send the URL (new or old)
        }) 
      });
      const data = await res.json();

      if (data.success) {
        onUpdateUser(data.user); 
        onClose();
      } else {
        alert(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      alert("Error saving profile");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ bgcolor: '#008069', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Profile
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3} mt={1}>
          
          {/* AVATAR WITH BADGE */}
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <IconButton 
                onClick={() => fileInputRef.current.click()} 
                sx={{ bgcolor: '#008069', color: 'white', '&:hover': { bgcolor: '#006d59' }, width: 35, height: 35 }}
              >
                <CameraAltIcon fontSize="small" />
              </IconButton>
            }
          >
            <Avatar 
              src={preview} // Shows the preview URL or existing URL
              sx={{ width: 120, height: 120, bgcolor: '#dfe1e5' }}
            >
              {!preview && <PersonIcon sx={{ fontSize: 80, color: '#fff' }} />}
            </Avatar>
          </Badge>

          {/* HIDDEN INPUT */}
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            style={{ display: 'none' }} 
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Click camera to upload
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" gap={3}>
          <TextField 
            label="Your Name" 
            variant="standard" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />

          <TextField 
            label="About" 
            variant="standard" 
            value={about} 
            onChange={(e) => setAbout(e.target.value)}
            fullWidth
            multiline
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSave} 
          startIcon={<SaveIcon />}
          disabled={loading}
          sx={{ bgcolor: '#008069' }}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileSettings;