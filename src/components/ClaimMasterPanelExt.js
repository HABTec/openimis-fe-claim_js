import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";

import { Grid, Typography, Divider, Button } from "@material-ui/core";
import { withTheme, withStyles } from "@material-ui/core/styles";

import {
  PublishedComponent,
  FormattedMessage,
  ProgressOrError,
  TextInput,
  historyPush,
  withHistory,
  withModulesManager,
  getTimeDifferenceInDaysFromToday,
  formatMessage,
} from "@openimis/fe-core";
import {
  clearLastClaimAt,
  fetchLastClaimAt,
  clearLastClaimWithSameDiagnosis,
  fetchLastClaimWithSameDiagnosis,
} from "../actions";
import { DEFAULT, POLICY_ACTIVE_STATUS } from "../constants";
import AdditionalPanelHeaders from "./AdditionalPanelHeaders";
import AdditionalPanelInsuree from "./AdditionalPanelInsuree";
import AdditionalPanelClaim from "./AdditionalPanelClaim";

const styles = (theme) => ({
  tableHeader: theme.table.header,
  item: theme.paper.item,
  inactiveLabel: {
    color: "#e20606",
  },
});

const ACTIVE_LABEL = "ClaimMasterPanelExt.InsureePolicyEligibilitySummaryActive.header";
const INACTIVE_LABEL = "ClaimMasterPanelExt.InsureePolicyEligibilitySummaryInactive.header";
const DEFAULT_LABEL = "ClaimMasterPanelExt.InsureePolicyEligibilitySummary.header";

class ClaimMasterPanelExt extends Component {
  constructor(props) {
    super(props);
    this.isAdditionalPanelEnabled = props.modulesManager.getConf(
      "fe-claim",
      "ClaimMasterPanelExt.isAdditionalPanelEnabled",
      DEFAULT.IS_ADDITIONAL_PANEL_ENABLED,
    );
  }

  componentDidMount() {
    const { claim, clearLastClaimAt, fetchLastClaimAt, fetchLastClaimWithSameDiagnosis } = this.props;
    clearLastClaimAt();
    if (!!claim?.insuree && !!claim?.healthFacility) {
      fetchLastClaimAt(claim);
    }
    if (this.isAdditionalPanelEnabled && !!claim?.insuree?.chfId && !!claim?.icd) {
      fetchLastClaimWithSameDiagnosis(claim.icd, claim.insuree);
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { claim, fetchLastClaimAt, fetchLastClaimWithSameDiagnosis } = this.props;
    if (
      !!claim &&
      !!claim.insuree &&
      !!claim.healthFacility &&
      (!prevProps.claim ||
        !prevProps.claim.insuree ||
        !prevProps.claim.healthFacility ||
        prevProps.claim.insuree.chfId !== claim.insuree.chfId ||
        prevProps.claim.healthFacility.chfId !== claim.healthFacility.chfId)
    ) {
      fetchLastClaimAt(claim);
      if (this.isAdditionalPanelEnabled && !!claim.insuree.chfId && !!claim.icd) {
        fetchLastClaimWithSameDiagnosis(claim.icd, claim.insuree.chfId);
      }
    }
  }

  componentWillUnmount() {
    const { clearLastClaimAt } = this.props;
    clearLastClaimAt();
  }

  goToClaimUuid(uuid) {
    const { modulesManager, history, readOnly } = this.props;

    if (readOnly) {
        let path = modulesManager.getRef("claim.route.claimReview");

        if (path) {
            path = path.replace(":claim_uuid", uuid);

            
            if (!path.startsWith("/")) {
                path = "/" + path;
            }

            const fullUrl = history.createHref({ pathname: path });
            // window.location.assign(fullUrl);
            window.open(fullUrl, "_blank")
            
        } else {
            console.error("Route 'claim.route.claimReview' is missing in index.js refs.");
        }

    } else {
        historyPush(modulesManager, history, "claim.route.claimEdit", [uuid], true);
    }
}

  valuatePolicyValidity = (currentPolicy) => {
    const { classes } = this.props;

    if (!currentPolicy?.length) {
      return { policyInfoLabel: INACTIVE_LABEL, policyInfoStyle: classes.inactiveLabel };
    }

    const validityPeriod = getTimeDifferenceInDaysFromToday(currentPolicy[0].expiryDate);
    const isPolicyActive = currentPolicy[0].status === POLICY_ACTIVE_STATUS;

    return {
      policyInfoLabel: validityPeriod >= 0 && isPolicyActive ? ACTIVE_LABEL : INACTIVE_LABEL,
      policyInfoStyle: validityPeriod >= 0 && isPolicyActive ? classes.activeLabel : classes.inactiveLabel,
    };
  };

  render() {
    const {
      classes,
      claim,
      fetchingLastClaimAt,
      errorLastClaimAt,
      fetchedLastClaimAt,
      lastClaimAt,
      restore,
      isRestored,
      intl,
      fetchedSameDiagnosisClaim,
      fetchingSameDiagnosisClaim,
      sameDiagnosisClaim,
      errorSameDiagnosisClaim,
      currentPolicy,
      dateTo,
      dateFrom,
      insuree,
    } = this.props;
    const { policyInfoLabel, policyInfoStyle } = this.valuatePolicyValidity(currentPolicy);

    return (
      <Grid container>
        <Grid item xs={6} className={classes.item}>
          <Typography className={policyInfoStyle}>
            <FormattedMessage module="claim" id={policyInfoLabel} />
          </Typography>
          <Divider />
        </Grid>
        <Grid item xs={6} className={classes.item}>
          <Typography className={classes.tableTitle}>
            <FormattedMessage module="claim" id="ClaimMasterPanelExt.InsureeLastVisit.header" />
          </Typography>
          <Divider />
        </Grid>
        <Grid item xs={6} className={classes.item}>
          <PublishedComponent
            pubRef="policy.InsureePolicyEligibilitySummary"
            insuree={!!claim ? claim.insuree : null}
            targetDate={!!claim ? claim.dateFrom ?? claim.dateTo : null}
          />
        </Grid>
        <Grid item xs={6} className={classes.item}>
          <ProgressOrError progress={fetchingLastClaimAt} error={errorLastClaimAt} />
          {!!fetchedLastClaimAt && !lastClaimAt && (
            <FormattedMessage module="claim" id="ClaimMasterPanelExt.InsureeLastVisit.noOtheClaim" />
          )}
          {!!fetchedLastClaimAt && lastClaimAt?.uuid === claim.uuid && (
            <FormattedMessage module="claim" id="ClaimMasterPanelExt.InsureeLastVisit.thisClaimIsFirstVisit" />
          )}
          {!!fetchedLastClaimAt && !!lastClaimAt && lastClaimAt?.uuid !== claim.uuid && (
            <Grid container>
              <Grid xs={4} item className={classes.item}>
                <TextInput
                  module="claim"
                  label="ClaimMasterPanelExt.InsureeLastVisit.claimCode"
                  readOnly={true}
                  value={lastClaimAt.code}
                />
              </Grid>
              <Grid xs={4} item className={classes.item}>
                <PublishedComponent
                  pubRef="core.DatePicker"
                  value={lastClaimAt.dateFrom}
                  module="claim"
                  label="ClaimMasterPanelExt.InsureeLastVisit.lastClaimAtFrom"
                  readOnly={true}
                />
              </Grid>
              <Grid xs={4} item className={classes.item}>
                <PublishedComponent
                  pubRef="core.DatePicker"
                  value={lastClaimAt.dateTo}
                  module="claim"
                  label="ClaimMasterPanelExt.InsureeLastVisit.lastClaimAtTo"
                  readOnly={true}
                />
              </Grid>
              <Button variant="contained" color="primary" onClick={() => this.goToClaimUuid(lastClaimAt.uuid)}>
                {formatMessage(intl, "claim", "ClaimMasterPanelExt.InsureeInfo.goToClaim.Button")}
              </Button>
            </Grid>
          )}
        </Grid>
        {this.isAdditionalPanelEnabled && <AdditionalPanelHeaders />}
        {this.isAdditionalPanelEnabled && (
          <AdditionalPanelInsuree
            dateTo={dateTo}
            dateFrom={dateFrom}
            insuree={insuree}
            dateClaimed={claim?.dateClaimed}
            isEdited={claim?.uuid}
          />
        )}
        {this.isAdditionalPanelEnabled && (
          <Grid item xs={6} className={classes.item}>
            <ProgressOrError progress={fetchingSameDiagnosisClaim} error={errorSameDiagnosisClaim} />
            {!!fetchedSameDiagnosisClaim && !sameDiagnosisClaim && (
              <FormattedMessage module="claim" id="ClaimMasterPanelExt.sameDiagnosisClaim.noClaim" />
            )}
            {!!fetchedSameDiagnosisClaim && sameDiagnosisClaim?.uuid === claim.uuid && (
              <FormattedMessage module="claim" id="ClaimMasterPanelExt.sameDiagnosisClaim.onlyThis" />
            )}
            {!!fetchedSameDiagnosisClaim && !!sameDiagnosisClaim && sameDiagnosisClaim?.uuid !== claim.uuid && (
              <AdditionalPanelClaim sameDiagnosisClaim={sameDiagnosisClaim} />
            )}
          </Grid>
        )}
        {isRestored && restore?.uuid && (
          <Grid item xs={6} className={classes.item}>
            <Typography>
              <FormattedMessage module="claim" id="ClaimMasterPanelExt.restore" />
            </Typography>
            <Button variant="contained" color="primary" onClick={() => this.goToClaimUuid(restore.uuid)}>
              {restore?.code}
            </Button>
          </Grid>
        )}
      </Grid>
    );
  }
}

const mapStateToProps = (state) => ({
  fetchingLastClaimAt: state.claim.fetchingLastClaimAt,
  fetchedLastClaimAt: state.claim.fetchedLastClaimAt,
  lastClaimAt: state.claim.lastClaimAt,
  errorLastClaimAt: state.claim.errorLastClaimAt,
  fetchingSameDiagnosisClaim: state.claim.fetchingSameDiagnosisClaim,
  fetchedSameDiagnosisClaim: state.claim.fetchedSameDiagnosisClaim,
  sameDiagnosisClaim: state.claim.sameDiagnosisClaim,
  errorSameDiagnosisClaim: state.claim.errorSameDiagnosisClaim,
  currentPolicy: state.policy.policies,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    { fetchLastClaimAt, clearLastClaimAt, fetchLastClaimWithSameDiagnosis, clearLastClaimWithSameDiagnosis },
    dispatch,
  );
};

export default withHistory(
  withModulesManager(
    connect(mapStateToProps, mapDispatchToProps)(injectIntl(withTheme(withStyles(styles)(ClaimMasterPanelExt)))),
  ),
);
