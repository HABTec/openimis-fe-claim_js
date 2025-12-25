import React, { Component } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { 
  PublishedComponent, 
  withModulesManager, 
  withHistory 
} from "@openimis/fe-core";
import { Button, Paper, CircularProgress, Snackbar } from "@material-ui/core";
import MuiAlert from '@material-ui/lab/Alert';
import { Check as CheckIcon, Delete as DeleteIcon } from "@material-ui/icons"; 
import { withStyles } from "@material-ui/core/styles";

import { checkInInsuree, removeCheckInInsuree, fetchInsureeCheckInStatus, clearAlert } from "../actions"; 

const styles = (theme) => ({
  page: theme.page,
  actionFooter: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(2),
    paddingRight: theme.spacing(12),
    backgroundColor: '#fff',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  spacer: {
      height: 80 
  },
  wrapper: {
    position: 'relative',
  },
  buttonProgress: {
    position: 'absolute',
    top: '50%',
    left: '-2%',
    marginTop: -12,
    marginLeft: -12,
  },
  deleteButton: {
    backgroundColor: "#DD2804", 
    color: theme.palette.error.contrastText,  
    '&:hover': {
      backgroundColor: "#BB2103",
    },
  },
});

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class CheckInInsureePage extends Component {

  componentDidMount() {
    const { insuree_uuid, modulesManager } = this.props;
    if (insuree_uuid) {
      this.props.fetchInsureeCheckInStatus(modulesManager, insuree_uuid);
    }
  }

  handleToggleCheckIn = () => {
    const { insuree_uuid, modulesManager, checkedIn, persistedCheckInStatus } = this.props;
    const isCheckedIn = checkedIn || persistedCheckInStatus;

    if (isCheckedIn) {
      // Call Remove Action
      this.props.removeCheckInInsuree(modulesManager, insuree_uuid);
    } else {
      // Call Check-In Action
      this.props.checkInInsuree(modulesManager, insuree_uuid);
    }
  };

  handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    this.props.clearAlert();
  };

  render() {
    const { 
      classes, 
      insuree_uuid, 
      family_uuid, 
      checkingIn, 
      checkedIn,           
      persistedCheckInStatus,
      alert
    } = this.props;

    const isFetchingStatus = persistedCheckInStatus === null;
    const isLoading = checkingIn || isFetchingStatus;
    const isCheckedIn = (persistedCheckInStatus === true) || (checkedIn === true && !checkingIn);
    const loadingIcon = <CircularProgress size={24} color="inherit" />;
    const actionIcon = isCheckedIn ? <DeleteIcon /> : <CheckIcon />;

    return (
      <div className={classes.page}>
        <PublishedComponent
          pubRef="insuree.components.InsureeForm"
          insuree_uuid={insuree_uuid}
          family_uuid={family_uuid}
          readOnly={true}            
        />
        
        <div className={classes.spacer} />

        <Paper className={classes.actionFooter} elevation={3}>
          <div className={classes.wrapper}>
            <Button
                variant="contained"
                className={!isLoading && isCheckedIn ? classes.deleteButton : null}
                color= {"primary"}
                size="large"
                startIcon={isLoading ? loadingIcon : actionIcon} 
                onClick={this.handleToggleCheckIn}
                disabled={isLoading}
            >
                {isLoading ? "Loading..." : (isCheckedIn ? "Remove" : "Check-In")}
            </Button>
          </div>
        </Paper>
        <Snackbar 
          open={!!alert} 
          autoHideDuration={3000} 
          onClose={this.handleCloseAlert}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {alert ? (
            <Alert onClose={this.handleCloseAlert} severity={alert.type || "success"}>
              {alert.message}
            </Alert>
          ) : <div/>} 
        </Snackbar>
      </div>
    );
  }
}

const mapStateToProps = (state, props) => ({
  insuree_uuid: props.match.params.insuree_uuid,
  checkingIn: state.claim ? state.claim.checkingIn : false,
  checkedIn: state.claim ? state.claim.checkedIn : false,
  persistedCheckInStatus: state.claim ? state.claim.persistedCheckInStatus : false,
  alert: state.claim ? state.claim.alert : null,
});

const mapDispatchToProps = (dispatch) => 
  bindActionCreators({ 
    checkInInsuree, 
    removeCheckInInsuree, 
    fetchInsureeCheckInStatus,
    clearAlert
  }, dispatch);

export default withModulesManager(
  withHistory(
    connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(CheckInInsureePage))
  )
);