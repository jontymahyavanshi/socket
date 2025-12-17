// src/components/NewGroupDialog.jsx
import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, List, ListItem, ListItemAvatar,
  Avatar, ListItemText, Checkbox
} from "@mui/material";

const NewGroupDialog = ({ open, onClose, following, onCreateGroup }) => {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([]);

  const toggleMember = (id) => {
    setMembers((prev) => 
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!name || members.length === 0) return alert("Add name and members");
    onCreateGroup(name, members);
    // Reset state after creation
    setName("");
    setMembers([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Create Group</DialogTitle>
      <DialogContent dividers>
        <TextField 
          fullWidth 
          label="Group Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          margin="dense"
        />
        <List sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
          {following.map((f) => (
            <ListItem key={f._id} button onClick={() => toggleMember(f._id)}>
              <ListItemAvatar>
                <Avatar src={f.profilePic} />
              </ListItemAvatar>
              <ListItemText primary={f.name} />
              <Checkbox checked={members.includes(f._id)} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!name || members.length === 0}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewGroupDialog;