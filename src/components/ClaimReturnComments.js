import React, { useState } from "react";
import { Paper, Typography, Collapse, IconButton, Divider, Box } from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

const ClaimReturnComments = ({ returnReasons = [], predefinedReasons = [] }) => {
  const maxHeight = 250;
  const [open, setOpen] = useState(false);
  const safeReasons = Array.isArray(returnReasons) ? returnReasons : [];

  const getReasonName = (code) => {
    if (!code) return null;

    const safeList = Array.isArray(predefinedReasons) ? predefinedReasons : [];

    const found = safeList.find((r) => String(r.code) === String(code));
    return found ? found.name : code;
  };

  if (!safeReasons.length) return null;

  return (
    <Paper style={{ marginTop: 16, padding: 12 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center">
          <IconButton
            aria-label={open ? "Collapse comments" : "Expand comments"}
            onClick={() => setOpen((s) => !s)}
            size="small"
          >
            <ExpandMoreIcon
              style={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
              }}
            />
          </IconButton>

          <Typography variant="h6" component="span" style={{ marginLeft: 8 }}>
            Comments ({safeReasons.length})
          </Typography>
        </Box>
      </Box>

      <Collapse in={open}>
        <div
          style={{
            maxHeight: maxHeight,
            overflowY: "auto",
            paddingRight: 8,
            marginTop: 12,
          }}
        >
          {safeReasons.map((rr) => (
            <div key={rr.id} style={{ marginBottom: 12 }}>
              {rr.returnedDate && (
                <Typography variant="body2" color="textSecondary">
                  {new Date(rr.returnedDate).toLocaleString()}
                </Typography>
              )}

              {(rr.predefinedReason && rr.predefinedReason !== "0") && (
                <Typography variant="body2">
                  <strong>Predefined Reason:</strong> {getReasonName(rr.predefinedReason)}
                </Typography>
              )}

              {rr.reason && (
                <Typography variant="body2">
                  <strong>Comment:</strong> {rr.reason}
                </Typography>
              )}

              {rr.returnedBy && (
                <Typography variant="body2">
                  <strong>Author:</strong> {rr.returnedBy.otherNames}
                </Typography>
              )}

              {rr.returnType && (
                <Typography variant="body2">
                  <strong>From:</strong>{" "}
                  {rr.returnType === 18 ? "Branch" : rr.returnType === 17 ? "Facility Head" : "Claim Preparer"}
                </Typography>
              )}

              <Divider style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      </Collapse>
    </Paper>
  );
};

export default ClaimReturnComments;
