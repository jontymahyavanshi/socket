// src/components/DeleteMessageDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent, // <--- Make sure this is added here
  DialogActions,
  Typography,
  Button,
} from "@mui/material";

const DeleteMessageDialog = ({ 
  open, 
  onClose, 
  onDeleteForMe, 
  onDeleteForEveryone, 
  isSender 
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Message?</DialogTitle>
      <DialogActions sx={{ flexDirection: "column", gap: 1, p: 2 }}>
        
        {/* Option 1: Delete for Everyone (Only visible if you sent the message) */}
        {isSender && (
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={onDeleteForEveryone}
          >
            Delete for Everyone
          </Button>
        )}

        {/* Option 2: Delete for Me (Always visible) */}
        <Button 
          fullWidth 
          variant="outlined" 
          onClick={onDeleteForMe}
        >
          Delete for Me
        </Button>

        {/* Option 3: Cancel */}
        <Button 
          fullWidth 
          color="inherit" 
          onClick={onClose}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteMessageDialog;