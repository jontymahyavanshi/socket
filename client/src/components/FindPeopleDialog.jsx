// src/components/FindPeopleDialog.jsx
import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, Avatar, ListItemText, Button
} from "@mui/material";

const FindPeopleDialog = ({ open, onClose, allUsers, following, onSendRequest }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Find People</DialogTitle>
      <DialogContent dividers>
        <List>
          {allUsers.map((u) => (
            <ListItem key={u._id}>
              <Avatar src={u.profilePic} sx={{ mr: 2 }} />
              <ListItemText primary={u.name} />
              {following.some((f) => f._id === u._id) ? (
                <Button disabled>Added</Button>
              ) : (
                <Button onClick={() => onSendRequest(u._id)}>Follow</Button>
              )}
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FindPeopleDialog;