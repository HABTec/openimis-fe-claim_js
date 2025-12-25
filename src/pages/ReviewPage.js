import React, { Component, Fragment } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { withTheme, withStyles } from "@material-ui/core/styles";
import {
  withModulesManager,
  withHistory,
  formatMessageWithValues,
  formatMessage,
  historyPush,
  journalize,
  coreAlert,
} from "@openimis/fe-core";
import {
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
} from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";
import ClearIcon from "@material-ui/icons/Clear";
import BlockIcon from "@material-ui/icons/Block";
import FlagIcon from "@material-ui/icons/Flag";
import ReplyIcon from "@material-ui/icons/Reply";
import ClaimReturnComments from "../components/ClaimReturnComments";
import ClaimForm from "../components/ClaimForm";
import {
  saveReview,
  deliverReview,
  fetchClaim,
  fetchPredefinedClaimReasons,
  returnClaim,
  fetchClaimReturnReasons,
  clearClaimReturnReasons,
  changeClaimStatus,
} from "../actions";
import _ from "lodash";
import { STATUS_RETURNED_FROM_BRANCH } from "../constants";
import FinancialSummary from "../components/FinancialSummary";

const styles = (theme) => ({
  // page: theme.page,
  root: {
    display: "flex",
    flexDirection: "column",
  },
  submissionPanel: {
    padding: theme.spacing(3),
    marginTop: theme.spacing(4),
    // marginBottom: theme.spacing(4),
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

const STATUS_REJECTED = 1;
const STATUS_SUBMITTED = 4; // Submitted from Head
const STATUS_VALUATED = 16; // Approved
const STATUS_RESUBMITTED = 21; // Resubmitted from Head
const STATUS_FLAGGED = 22;
class ReviewPage extends Component {
  state = {
    close: false,
    claim: null,
    selectedReason: null,
    comment: "",
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

  componentDidUpdate(prevProps, prevState, snapshot) {
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

    if (prevProps.submittingMutation && !this.props.submittingMutation) {
      if (this.state.close) {
        const { history, modulesManager } = prevProps;
        const { customBackUri, customBackUuid } = prevProps.match?.params;
        if (customBackUri) {
          historyPush(modulesManager, history, customBackUri, customBackUuid ? [customBackUuid] : null);
        } else {
          historyPush(this.props.modulesManager, this.props.history, "claim.route.reviews");
        }
      }
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
    const { claim } = this.state;
    if (!claim) return { showPanel: false };

    const status = claim.status;
    let showApprove = false;
    let showFlag = false;
    let showReject = false;
    let showReturn = false;
    let requireInputs = false;

    if (status === STATUS_SUBMITTED || status === STATUS_RESUBMITTED) {
      showApprove = true;
      showFlag = true;
    } else if (status === STATUS_FLAGGED) {
      showApprove = true;
      showReject = true;
      showReturn = true;
      requireInputs = true;
    }

    return {
      showPanel: showApprove || showFlag || showReject || showReturn,
      showApprove,
      showFlag,
      showReject,
      showReturn,
      requireInputs,
    };
  }

  performAction = async (actionType) => {
    const { claim, selectedReason, comment } = this.state;
    const { intl, saveReview, returnClaim, coreAlert, changeClaimStatus, back } = this.props;

    this.setState({ isSubmitting: true });

    try {
      let mutationLabel = "";
      let resp;
      const claimPayload = { ...claim };

      // 1. Define the success message key dynamically based on action
      const successMessageKey = `claim.action.success.${actionType.toLowerCase()}`;

      if (actionType === "RETURN" || actionType === "REJECT") {
        const type = actionType === "RETURN" ? STATUS_RETURNED_FROM_BRANCH : STATUS_REJECTED;
        mutationLabel = formatMessageWithValues(intl, "claim", `${actionType}Claim.mutationLabel`, {
          code: claim.code,
        });

        resp = await returnClaim(claim.uuid, selectedReason, comment, type, mutationLabel);
      } else {
        let returnType;
        if (actionType === "APPROVE") {
          returnType = STATUS_VALUATED;
          mutationLabel = formatMessageWithValues(intl, "claim", "ApproveClaim.mutationLabel", { code: claim.code });
        } else if (actionType === "FLAG") {
          returnType = STATUS_FLAGGED;
          mutationLabel = formatMessageWithValues(intl, "claim", "FlagClaim.mutationLabel", { code: claim.code });
        }

        resp = await changeClaimStatus([claim.uuid], returnType, mutationLabel);
      }

      // Check for GraphQL/Payload errors
      if (resp?.payload?.errors?.length) {
        throw new Error(resp.payload.errors[0].message);
      }

      // 2. Success Feedback
      coreAlert(
        formatMessage(intl, "claim", "claim.action.success", "Success"),
        formatMessage(intl, "claim", successMessageKey, { code: claim.code }),
      );

      // 3. Cleanup and Navigate back
      this.setState({ isSubmitting: false });

      // If a 'back' function was passed in props, use it to close/navigate
      if (back) {
        back();
      } else {
        // Fallback navigation if back prop isn't provided
        historyPush(this.props.modulesManager, this.props.history, "claim.route.reviews");
      }
    } catch (error) {
      coreAlert(formatMessage(intl, "claim", "claim.action.error", "Error"), error.message || "Action Failed");
      this.setState({ isSubmitting: false });
    }
  };

  save = (claim) => {
    if (!!claim && (!!claim.items || !!claim.services)) {
      this.setState({ close: false }, (e) =>
        this.props.saveReview(
          claim,
          formatMessageWithValues(this.props.intl, "claim", "SaveClaimReview.mutationLabel", { code: claim.code }),
        ),
      );
    }
  };

  deliverReview = (claim) => {
    if (!!claim && (!!claim.items || !!claim.services)) {
      this.setState({ close: true }, (e) =>
        this.props.deliverReview(
          [claim],
          formatMessageWithValues(this.props.intl, "claim", "DeliverClaimReview.mutationLabel", { code: claim.code }),
        ),
      );
    }
  };

  renderActionPanel(context) {
    const { classes, intl, returnedReasons } = this.props;
    const { selectedReason, comment, isSubmitting } = this.state;

    if (!context.showPanel) return null;

    const hasReason = !!selectedReason;
    const hasComment = comment && comment.trim().length > 0;

    const approveDisabled = context.requireInputs && (hasReason || hasComment);

    const returnRejectDisabled = context.requireInputs && (!hasReason || !hasComment);

    return (
      <Paper className={classes.submissionPanel} elevation={3}>
        <Grid container spacing={3}>
          {context.requireInputs && (
            <Fragment>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {formatMessage(intl, "claim", "claim.returnReasons.title", "Reason (Mandatory for Return/Reject)")}
                </Typography>
                {hasReason && (
                    <Button size="small" onClick={this.handleClearReason} startIcon={<ClearIcon />}>
                      {formatMessage(intl, "claim", "clear", "Clear")}
                    </Button>
                  )}
                  <RadioGroup name="returnReason" value={selectedReason} onChange={this.handleReasonChange}>
                    {returnedReasons &&
                      returnedReasons.map((reason) => (
                        <FormControlLabel
                          key={reason.code}
                          value={String(reason.code)}
                          control={<Radio color="primary" />}
                          label={reason.name}
                        />
                      ))}
                  </RadioGroup>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label={formatMessage(intl, "claim", "claim.comment", "Comment (Mandatory for Return/Reject)")}
                  multiline
                  rows={3}
                  variant="outlined"
                  fullWidth
                  value={comment}
                  onChange={this.handleCommentChange}
                />
              </Grid>
            </Fragment>
          )}

          <Grid item xs={12}>
            <div className={classes.buttonContainer}>
              {context.showReturn && (
                <Button
                  variant="contained"
                  style={{ backgroundColor: returnRejectDisabled ? undefined : "#d32f2f", color: "#fff" }}
                  startIcon={<ReplyIcon />}
                  onClick={() => this.performAction("RETURN")}
                  disabled={isSubmitting || returnRejectDisabled}
                >
                  {formatMessage(intl, "claim", "claim.action.return", "Return")}
                </Button>
              )}

              {context.showReject && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<BlockIcon />}
                  onClick={() => this.performAction("REJECT")}
                  disabled={isSubmitting || returnRejectDisabled}
                >
                  {formatMessage(intl, "claim", "action.reject", "Reject")}
                </Button>
              )}

              {context.showFlag && (
                <Button
                  variant="contained"
                  style={{ backgroundColor: "#ff9800", color: "#fff" }}
                  startIcon={<FlagIcon />}
                  onClick={() => this.performAction("FLAG")}
                  disabled={isSubmitting}
                >
                  {formatMessage(intl, "claim", "action.flag", "Flag")}
                </Button>
              )}

              {context.showApprove && (
                <div className={classes.wrapper}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckIcon />}
                    onClick={() => this.performAction("APPROVE")}
                    disabled={isSubmitting || approveDisabled}
                  >
                    {formatMessage(intl, "claim", "action.approve", "Approve")}
                  </Button>
                  {isSubmitting && <CircularProgress size={24} className={classes.buttonProgress} />}
                </div>
              )}
            </div>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  render() {
    const { classes, history, modulesManager, claim_uuid, returnReasons, returnedReasons } = this.props;
    const { customBackUri, customBackUuid } = this.props.match?.params;
    const context = this.getSubmissionContext();
    return (
      <div className={classes.page}>
        <ClaimForm
          claim_uuid={claim_uuid}
          back={(e) => {
            if (customBackUri) {
              historyPush(modulesManager, history, customBackUri, customBackUuid ? [customBackUuid] : null);
            } else {
              historyPush(modulesManager, history, "claim.route.reviews");
            }
          }}
          // save={this.save}
          deliverReview={this.deliverReview}
          forReview={true}
          onEditedChanged={this.handleClaimChange}
        />
        {this.state.claim && this.state.claim.status === STATUS_FLAGGED && (
          <FinancialSummary claim={this.state.claim} />
        )}
        <ClaimReturnComments returnReasons={this.props.returnReasons} predefinedReasons={this.props.returnedReasons} />

        {this.renderActionPanel(context)}
      </div>
    );
  }
}

const mapStateToProps = (state, props) => ({
  claim_uuid: props.match.params.claim_uuid,
  claim: state.claim.claim,
  back: props.back,
  submittingMutation: state.claim.submittingMutation,
  mutation: state.claim.mutation,
  returnedReasons: state.claim.returnedClaimReasons, // predefined Reasons
  returnReasons: state.claim.returnReasons, // returned comments
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      deliverReview,
      saveReview,
      journalize,
      fetchClaim,
      fetchPredefinedClaimReasons,
      returnClaim,
      fetchClaimReturnReasons,
      clearClaimReturnReasons,
      coreAlert,
      changeClaimStatus,
    },
    dispatch,
  );
};

export default withHistory(
  withModulesManager(
    connect(mapStateToProps, mapDispatchToProps)(injectIntl(withTheme(withStyles(styles)(ReviewPage)))),
  ),
);
