import React, { Component, Fragment } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { withModulesManager, formatMessage, journalize, coreConfirm, coreAlert } from "@openimis/fe-core";
import { withStyles, withTheme } from "@material-ui/core/styles";
import {
  Button,
  Paper,
  Typography,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  CircularProgress,
} from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";
import ReplyIcon from "@material-ui/icons/Reply";
import ClearIcon from "@material-ui/icons/Clear";
import {
  fetchPredefinedClaimReasons,
  submitToFacilityHead,
  submitToBranch,
  resubmitToBranch,
  returnClaim,
  resubmitClaim,
  fetchClaim,
  fetchClaimReturnReasons,
  // removeCheckInInsuree,
  clearClaimReturnReasons,
} from "../actions";
import {
  STATUS_ENTERED,
  STATUS_RETURNED_FROM_FACILITY,
  STATUS_RETURNED_FROM_BRANCH,
  STATUS_SUBMITTED_TO_HEAD,
  STATUS_RESUBMITTED_TO_HEAD,
} from "../constants";
import ClaimForm from "../components/ClaimForm";
import ClaimReturnComments from "../components/ClaimReturnComments";

const styles = (theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
  },
  submissionPanel: {
    padding: theme.spacing(3),
    marginTop: theme.spacing(4),
  },
  panelTitle: {
    marginBottom: theme.spacing(1),
    fontWeight: "bold",
    fontSize: "1.1rem",
  },
  radioGroup: {
    flexDirection: "column",
  },
  commentField: {
    marginTop: theme.spacing(2),
  },
  buttonContainer: {
    marginTop: theme.spacing(3),
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(2),
  },
  wrapper: {
    position: "relative",
  },
  buttonProgress: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
});

class ClaimEditWrapper extends Component {
  state = {
    claim: null,
    comment: "",
    selectedReason: null,
    isSubmitting: false,
  };

  componentDidMount() {
    this.props.fetchPredefinedClaimReasons(this.props.modulesManager);

    if (this.props.claim_uuid) {
      this.props.clearClaimReturnReasons();
      // this.props.fetchClaim(this.props.modulesManager, this.props.claim_uuid);
      this.props.fetchClaim(this.props.modulesManager, this.props.claim_uuid, this.props.forFeedback);
      this.props.fetchClaimReturnReasons(this.props.modulesManager, this.props.claim_uuid);
    }
    this.setState({ claim: this.props.claim });
  }

  componentWillUnmount() {
    if (this.props.clearClaimReturnReasons) {
      this.props.clearClaimReturnReasons();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.claim?.uuid !== this.props.claim?.uuid || prevProps.claim?.status !== this.props.claim?.status) {
      this.setState({ claim: this.props.claim });
    }
    const claimChanged = this.props.claim !== prevProps.claim;
    const uuidChanged = this.props.claim?.uuid !== prevProps.claim?.uuid;
    const hasUuid = !!this.props.claim?.uuid;

    if (hasUuid && (claimChanged || uuidChanged)) {
      this.props.clearClaimReturnReasons();
      this.props.fetchClaimReturnReasons(this.props.modulesManager, this.props.claim.uuid);
    }
  }

  handleClaimChange = (claim) => {
    this.setState({ ...this.state, claim });
  };

  handleReasonChange = (event) => {
    this.setState({ ...this.state, selectedReason: event.target.value });
  };

  handleClearReason = () => {
    this.setState({ ...this.state, selectedReason: null });
  };

  handleCommentChange = (event) => {
    this.setState({ ...this.state, comment: event.target.value });
  };

  getSubmissionContext() {
    const { isHealthFacilityPage, forReview } = this.props;
    const { claim } = this.state;

    if (!claim || !claim.uuid) {
      return {
        showPanel: false,
        buttonLabel: "",
        isResubmit: false,
        commentRequired: false,
        actionType: null,
        showReturnButton: false,
        returnActionType: null,
        showReturnReasons: false,
      };
    }
    const claimStatus = claim?.status;

    let buttonLabel = "";
    let isResubmit = false;
    let commentRequired = false;
    let showPanel = false;
    let actionType = null;
    let showReturnButton = false;
    let returnActionType = null;
    let showReturnReasons = false;

    if (isHealthFacilityPage) {
      if (claimStatus === STATUS_ENTERED) {
        showPanel = true;
        buttonLabel = formatMessage(this.props.intl, "claim", "claim.action.submitToFacilityHead");
        actionType = "SUBMIT_HF";
        isResubmit = false;
      } else if (claimStatus === STATUS_RETURNED_FROM_BRANCH || claimStatus === STATUS_RETURNED_FROM_FACILITY) {
        showPanel = true;
        buttonLabel = formatMessage(this.props.intl, "claim", "claim.action.resubmitToFacilityHead");
        actionType = "RESUBMIT_HF";
        isResubmit = true;
        commentRequired = true;
        showReturnReasons = false;
      }
    } else if (forReview && (claimStatus === STATUS_SUBMITTED_TO_HEAD || claimStatus === STATUS_RESUBMITTED_TO_HEAD)) {
      // --- To Be Reviewed Tab Logic ---
      showPanel = true;
      showReturnButton = true;
      returnActionType = "RETURN_HF";
      commentRequired = false;
      showReturnReasons = true;

      const rawReturnReasons = this.props.returnReasons;
      let returnReasonsArray = [];

      if (Array.isArray(rawReturnReasons)) {
        returnReasonsArray = rawReturnReasons;
      }
      const hasReturnedFromBranch = returnReasonsArray.some((r) => {
        const rt = r?.returnType ?? r?.return_type ?? r?.type;
        return Number(rt) === STATUS_RETURNED_FROM_BRANCH;
      });

      if (claimStatus !== STATUS_SUBMITTED_TO_HEAD) {
        if (hasReturnedFromBranch) {
          buttonLabel = formatMessage(this.props.intl, "claim", "claim.action.resubmitToBranch", "Resubmit to Branch");
          actionType = "RESUBMIT_BRANCH";
          isResubmit = true;
        } else {
          buttonLabel = formatMessage(this.props.intl, "claim", "claim.action.submitToBranch", "Submit to Branch");
          actionType = "SUBMIT_BRANCH";
          isResubmit = false;
        }
      } else {
        buttonLabel = formatMessage(this.props.intl, "claim", "claim.action.submitToBranch", "Submit to Branch");
        actionType = "SUBMIT_BRANCH";
        isResubmit = false;
      }
    }

    return {
      showPanel,
      buttonLabel,
      isResubmit,
      commentRequired,
      actionType,
      showReturnButton,
      returnActionType,
      showReturnReasons,
    };
  }

  doSubmit = async (type) => {
    const { claim, selectedReason, comment } = this.state;
    const { intl, back, coreAlert } = this.props;

    let action;
    let successMessageKey;
    const claimUuids = [claim.uuid];
    let clientMutationLabel;
    let clientMutationDetails = null;
    let returnType = null;

    // Handle Standard Submit/Resubmit and return Actions
    switch (type) {
      case "SUBMIT_HF":
        action = this.props.submitToFacilityHead;
        clientMutationLabel = "SubmitToHead";
        successMessageKey = "claim.action.submit.successMessage";
        break;
      case "RESUBMIT_HF":
        action = this.props.resubmitClaim;
        clientMutationLabel = "ResubmitToHead";
        successMessageKey = "claim.action.resubmit.successMessage";
        returnType = 20;
        clientMutationDetails = null;
        break;
      case "RETURN_HF":
        action = this.props.returnClaim;
        clientMutationLabel = "ReturnFromFacility";
        successMessageKey = "claim.action.return.successMessage";
        returnType = 17;
        break;
      case "RETURN_BRANCH":
        action = this.props.returnClaim;
        clientMutationLabel = "ReturnFromBranch";
        successMessageKey = "claim.action.return.successMessage";
        returnType = 18;
        break;
      case "SUBMIT_BRANCH":
        action = this.props.submitToBranch;
        clientMutationLabel = "SubmitToBranch";
        successMessageKey = "claim.action.submit.successMessage";
        break;
      case "RESUBMIT_BRANCH":
        action = this.props.resubmitToBranch;
        clientMutationLabel = "ResubmitToBranch";
        successMessageKey = "claim.action.resubmit.successMessage";
        returnType = 21;
        clientMutationDetails = null;
        break;
      default:
        this.setState({ isSubmitting: false });
        return;
    }

    let resp;

    try {
      if (type === "RETURN_HF" || type === "RETURN_BRANCH") {
        resp = await action(
          claim.uuid,
          selectedReason,
          comment,
          returnType,
          clientMutationLabel,
          clientMutationDetails,
        );
      } else if (type === "RESUBMIT_HF") {
        resp = await action(claim.uuid, comment, returnType, clientMutationLabel, clientMutationDetails);
      } else if (type === "RESUBMIT_BRANCH") {
        resp = await action(claimUuids, returnType, clientMutationLabel, clientMutationDetails);
      } else {
        resp = await action(claimUuids, clientMutationLabel, clientMutationDetails);
      }
      if (resp?.payload?.errors?.length) {
        throw new Error(resp.payload.errors[0].message);
      }
      // if (type === "SUBMIT_HF") {
      //   this.props.removeCheckInInsuree(this.props.modulesManager, claim.insuree.uuid);
      // }

      coreAlert(
        formatMessage(intl, "claim", "claim.action.success"),
        formatMessage(intl, "claim", successMessageKey, { code: claim.code }),
      );
      await this.props.fetchClaim(this.props.modulesManager, claim.uuid, false);
      this.setState({ isSubmitting: false });
      back();
    } catch (error) {
      this.props.coreAlert(
        formatMessage(intl, "claim", "claim.action.error"),
        error.message || formatMessage(intl, "claim", "claim.action.failureMessage"),
      );
      this.setState({ isSubmitting: false });
    }
  };

  performAction = (specificType) => {
    const { intl } = this.props;

    let confirmTitle, confirmMessage;

    if (specificType === "RETURN_HF" || specificType === "RETURN_BRANCH") {
      //   confirmTitle = formatMessage(intl, "claim", "returnClaim.confirm.title", "Confirm Return");
      //   confirmMessage = formatMessage(
      //     intl,
      //     "claim",
      //     "returnClaim.confirm.message",
      //     "Are you sure you want to return this claim?",
      //   );
    } else {
      const isResubmit = specificType.includes("RESUBMIT");
      const actionLabelKey = isResubmit ? "resubmit" : "submit";
      confirmTitle = formatMessage(intl, "claim", `claim.confirm.${actionLabelKey}.title`);
      confirmMessage = formatMessage(intl, "claim", `claim.confirm.${actionLabelKey}.message`);
    }

    // this.props.coreConfirm(confirmTitle, confirmMessage, () => {
    this.setState({ isSubmitting: true }, () => {
      this.doSubmit(specificType);
    });
    // });
  };

  renderSubmissionPanel(context) {
    const { classes, returnedReasons, intl } = this.props;
    const { selectedReason, comment, isSubmitting } = this.state;

    if (!context.showPanel) return null;

    // Show Reasons/Comment if:
    const showReasons = context.showReturnReasons;
    const showComment = context.commentRequired || context.showReturnButton;

    const hasReason = !!selectedReason;
    const hasComment = comment && comment.trim() !== "";

    let isSubmitDisabled = isSubmitting;

    if (context.isResubmit && context.commentRequired) {
      if (!hasComment || hasReason) {
        isSubmitDisabled = true;
      }
    } else {
      if (hasReason || hasComment) {
        isSubmitDisabled = true;
      }
    }

    const isReturnDisabled = isSubmitting || !hasReason || !hasComment;
    return (
      <Paper className={classes.submissionPanel} elevation={1}>
        <Grid container spacing={3}>
          {showReasons && (
            <Fragment>
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.panelTitle}>
                  {formatMessage(intl, "claim", "claim.returnReasons.title", "Select Reason (Required for Return)")}
                </Typography>
                {hasReason && (
                  <Button size="small" color="#0073ffee" onClick={this.handleClearReason} startIcon={<ClearIcon />}>
                    {formatMessage(intl, "claim", "clear", "Clear Selection")}
                  </Button>
                )}
                <RadioGroup
                  name="returnReason"
                  value={selectedReason}
                  onChange={this.handleReasonChange}
                  className={classes.radioGroup}
                >
                  {returnedReasons &&
                    returnedReasons.map((reason) => (
                      <FormControlLabel
                        key={reason.code}
                        value={String(reason.code)}
                        control={<Radio color="primary" checked={this.state.selectedReason === String(reason.code)} />}
                        label={reason.name}
                      />
                    ))}
                </RadioGroup>
              </Grid>
            </Fragment>
          )}
          {showComment && (
            <Fragment>
              <Grid item xs={12}>
                <TextField
                  label={formatMessage(intl, "claim", "claim.comment", "Comment")}
                  multiline
                  rows={3}
                  variant="outlined"
                  fullWidth
                  value={comment}
                  onChange={this.handleCommentChange}
                  required={context.commentRequired || (context.showReturnButton && hasReason)}
                  // helperText={
                  //     context.showReturnButton
                  //     ? formatMessage(intl, "claim", "claim.commentHelp", "Comment is required to Return, or to Resubmit.")
                  //     : ""
                  // }
                  className={classes.commentField}
                />
              </Grid>
            </Fragment>
          )}

          <Grid item xs={12}>
            <div className={classes.buttonContainer}>
              {/* RETURN BUTTON */}
              {context.showReturnButton && (
                <div className={classes.wrapper}>
                  <Button
                    variant="contained"
                    style={{ backgroundColor: isReturnDisabled ? undefined : "#d32f2f", color: "#fff" }}
                    size="large"
                    startIcon={<ReplyIcon />}
                    onClick={() => this.performAction(context.returnActionType)}
                    disabled={isReturnDisabled}
                  >
                    {formatMessage(intl, "claim", "claim.action.return", "Return")}
                  </Button>
                </div>
              )}

              {/* SUBMIT / RESUBMIT BUTTON */}
              <div className={classes.wrapper}>
                <Button
                  variant="contained"
                  color={context.isResubmit ? "secondary" : "primary"}
                  size="large"
                  startIcon={!isSubmitting && <CheckIcon />}
                  onClick={() => this.performAction(context.actionType)}
                  disabled={isSubmitDisabled}
                >
                  {context.buttonLabel}
                </Button>
                {isSubmitting && <CircularProgress size={24} className={classes.buttonProgress} />}
              </div>
            </div>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  render() {
    const { classes, ...restProps } = this.props;
    const submissionContext = this.getSubmissionContext();
    return (
      <div className={classes.root}>
        <ClaimForm {...restProps} onEditedChanged={this.handleClaimChange} />
        <ClaimReturnComments returnReasons={this.props.returnReasons} predefinedReasons={this.props.returnedReasons} />
        {this.renderSubmissionPanel(submissionContext)}
      </div>
    );
  }
}

const mapStateToProps = (state, props) => ({
  rights: state.core?.user?.i_user?.rights || [],
  returnedReasons: state.claim.returnedClaimReasons,
  claim_uuid: props.claim_uuid,
  claim: state.claim?.claim || null,
  back: props.back,
  preSelectedInsuree: props.preSelectedInsuree,
  add: props.add,
  save: props.save,
  forReview: props.forReview,
  forFeedback: props.forFeedback,
  isHealthFacilityPage: props.isHealthFacilityPage,
  claimContext: props.claimContext || {},
  returnReasons: state.claim.returnReasons,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchPredefinedClaimReasons,
      journalize,
      coreConfirm,
      coreAlert,
      submitToFacilityHead,
      submitToBranch,
      resubmitToBranch,
      resubmitClaim,
      fetchClaim,
      returnClaim,
      fetchClaimReturnReasons,
      // removeCheckInInsuree,
      clearClaimReturnReasons,
    },
    dispatch,
  );
};

export default withModulesManager(
  connect(mapStateToProps, mapDispatchToProps)(injectIntl(withTheme(withStyles(styles)(ClaimEditWrapper)))),
);
