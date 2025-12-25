import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Paper,
  Grid,
  Typography,
  Button,
  Collapse,
  Box,
  makeStyles,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  label: {
    fontWeight: 500,
  },
  value: {
    textAlign: "right",
    minWidth: 120,
  },
  toggleButton: {
    textTransform: "none",
    marginLeft: theme.spacing(1),
  },
  row: {
    padding: `${theme.spacing(1)}px 0`,
    borderBottom: "1px solid rgba(0,0,0,0.04)",
  },
  lastRow: {
    padding: `${theme.spacing(1)}px 0`,
  },
  smallText: {
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
  },
}));

function formatETB(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return "-";
  // Round to 2 decimals and append ETB
  const num = Number(amount);
  // Use simple formatting without locale-specific grouping to keep layout stable
  return `${num.toFixed(2)} ETB`;
}


export default function FinancialSummary({ claim }) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => {
    if (!claim) {
      return {
        providerClaimed: null,
        totalBillable: null,
        patientPayable: null,
        bypassFee: null,
      };
    }

    const n = (x) => {
      if (x === null || x === undefined) return null;
      const val = Number(x);
      return Number.isFinite(val) ? val : null;
    };

    const sum = (arr, accessor) => {
      if (!arr || !Array.isArray(arr)) return 0;
      return arr.reduce((acc, it) => {
        try {
          const v = accessor(it);
          const nv = n(v) ?? 0;
          return acc + nv;
        } catch (e) {
          return acc;
        }
      }, 0);
    };

    // providerClaimed: claim.claimed
    let providerClaimed = n(claim.claimed);
    if (providerClaimed === null) {
      // sum priceAsked * qtyProvided (items + services)
      const itemsClaimed = sum(claim.items, (it) => {
        return (n(it.priceAsked) ?? 0) * (n(it.qtyProvided) ?? 0);
      });
      const servicesClaimed = sum(claim.services, (s) => {
        return (n(s.priceAsked) ?? 0) * (n(s.qtyProvided) ?? 0);
      });
      providerClaimed = +(itemsClaimed + servicesClaimed);
    }

    // totalBillable: prefer claim.valuated
    let totalBillable = n(claim.valuated);
    if (totalBillable === null) {
      // sum priceValuated OR priceApproved*qtyApproved OR priceAdjusted*qtyApproved OR fallback priceAsked*qtyProvided
      const itemsBillable = sum(claim.items, (it) => {
        return (
          n(it.priceValuated) ??
          (n(it.priceApproved) && n(it.qtyApproved) ? n(it.priceApproved) * n(it.qtyApproved) : null) ??
          (n(it.priceAdjusted) && n(it.qtyApproved) ? n(it.priceAdjusted) * n(it.qtyApproved) : null) ??
          (n(it.priceAsked) && n(it.qtyProvided) ? n(it.priceAsked) * n(it.qtyProvided) : 0)
        );
      });
      const servicesBillable = sum(claim.services, (s) => {
        return (
          n(s.priceValuated) ??
          (n(s.priceApproved) && n(s.qtyApproved) ? n(s.priceApproved) * n(s.qtyApproved) : null) ??
          (n(s.priceAdjusted) && n(s.qtyApproved) ? n(s.priceAdjusted) * n(s.qtyApproved) : null) ??
          (n(s.priceAsked) && n(s.qtyProvided) ? n(s.priceAsked) * n(s.qtyProvided) : 0)
        );
      });
      totalBillable = +(itemsBillable + servicesBillable);
    }

    // patientPayable: try sum of deductible/exceed fields where present; otherwise providerClaimed - totalBillable
    let patientPayable = null;
    // Some item/service fields in openimis may be called deductableAmount, deductibleAmount, exceedCeilingAmount, exceedAmount, etc.
    const itemsPatientParts = sum(claim.items, (it) => {
      return (n(it.deductableAmount) ?? n(it.deductibleAmount) ?? 0) + (n(it.exceedCeilingAmount) ?? n(it.exceedAmount) ?? 0);
    });
    const servicesPatientParts = sum(claim.services, (s) => {
      return (n(s.deductableAmount) ?? n(s.deductibleAmount) ?? 0) + (n(s.exceedCeilingAmount) ?? n(s.exceedAmount) ?? 0);
    });
    const patientSum = itemsPatientParts + servicesPatientParts;
    if (patientSum > 0) {
      patientPayable = +patientSum;
    } else if (providerClaimed !== null && totalBillable !== null) {
      patientPayable = +(providerClaimed - totalBillable);
    } else {
      patientPayable = null;
    }

    // bypassFee: try to read from claim.jsonExt (not standard). If absent default 0.
    let bypassFee = null;
    try {
      const ext = claim.jsonExt || {};
      // common keys tried:
      bypassFee = n(ext.bypassFee ?? ext.bypass_fee ?? ext.bypass_amount ?? ext.bypassAmount) ?? 0;
      // if ext has a map or nested object, you can adjust here.
    } catch (e) {
      bypassFee = 0;
    }

    return {
      providerClaimed,
      totalBillable,
      patientPayable,
      bypassFee,
    };
  }, [claim]);

  // hide entirely if no claim provided
  if (!claim) return null;

  return (
    <Paper className={classes.paper} elevation={2}>
      <div className={classes.headerRow}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" style={{ marginRight: 8 }}>
            Financial Summary
          </Typography>
        </div>
        <div>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setOpen((s) => !s)}
            className={classes.toggleButton}
            startIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            {open ? "Hide Financial Summary" : "Show Financial Summary"}
          </Button>
        </div>
      </div>

      <Collapse in={open}>
        <Box mt={1}>
          <Grid container>
            <Grid item xs={8} className={classes.row}>
              <Typography className={classes.label}>Bypass Fee Amount</Typography>
            </Grid>
            <Grid item xs={4} className={classes.row}>
              <Typography className={classes.value}>{formatETB(totals.bypassFee)}</Typography>
            </Grid>

            <Grid item xs={8} className={classes.row}>
              <Typography className={classes.label}>Provider claimed amount</Typography>
            </Grid>
            <Grid item xs={4} className={classes.row}>
              <Typography className={classes.value}>{formatETB(totals.providerClaimed)}</Typography>
            </Grid>

            <Grid item xs={8} className={classes.row}>
              <Typography className={classes.label}>Patient Payable Amount</Typography>
            </Grid>
            <Grid item xs={4} className={classes.row}>
              <Typography className={classes.value}>{formatETB(totals.patientPayable)}</Typography>
            </Grid>

            <Grid item xs={8} className={classes.lastRow}>
              <Typography className={classes.label}>Total Billable Amount</Typography>
            </Grid>
            <Grid item xs={4} className={classes.lastRow}>
              <Typography className={classes.value}>{formatETB(totals.totalBillable)}</Typography>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
}

FinancialSummary.propTypes = {
  claim: PropTypes.object,
};
