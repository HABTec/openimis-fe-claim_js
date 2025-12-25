import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Paper, Tabs, Tab } from "@material-ui/core";
import { withTheme, withStyles } from "@material-ui/core/styles";
import {
  withHistory,
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  coreConfirm,
  Helmet,
  coreAlert,
  clearCurrentPaginationPage,
} from "@openimis/fe-core";

import ClaimPreparerSearcher from "../components/ClaimPreparerSearcher";
import { fetchClaimSummaries, selectHealthFacility, submitToBranch, resubmitToBranch } from "../actions";
import {
  RIGHT_CLAIMREVIEW,
  CLAIM_APPROVAL_FILTER_CONTRIBUTION_KEY,
  CLAIM_APPROVAL_ACTION_CONTRIBUTION_KEY,
} from "../constants";

const styles = (theme) => ({
  page: theme.page,
  tabsRoot: {
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: 4,
  },
  dialogField: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    width: "100%",
  },
  tabsFlexContainer: {
    display: "flex",
  },
  tabItem: {
    flexGrow: 1,
    maxWidth: "none",
  },
});

class ClaimApprovalPage extends Component {
  constructor(props) {
    super(props);

    this.tabDefinitions = [
      {
        id: 0,
        label: "claimSummaries.tabs.toBeReviewed",
        defaultLabel: "To Be Reviewed Claims",
        filter: { "claimStatus": { "value": 0, "filter": "status: 19" } },
      },
      {
        id: 1,
        label: "claimSummaries.tabs.resubmittedToBeReviewed",
        defaultLabel: "To Be Reviewed Resubmitted Claims",
        filter: { "claimStatus": { "value": 1, "filter": "status: 20" } },
      },
      {
        id: 2,
        label: "claimSummaries.tabs.submitted",
        defaultLabel: "Submitted",
        filter: { "claimStatus": { "value": 2, "filter": "status: 4" } },
      },
      {
        id: 3,
        label: "claimSummaries.tabs.resubmitted",
        defaultLabel: "Resubmitted",
        filter: { "claimStatus": { "value": 3, "filter": "status: 21" } },
      },
    ];

    this.state = {
      selectedTab: 0,
      resetKey: 0,
      feedbackDialogOpen: false,
      feedbackComment: "",
      claimsToReturn: [],
      cacheFiltersKey: `claimApprovalPage_tab_${0}`,
    };
  }

  componentDidMount() {
    this.props.clearCurrentPaginationPage();
  }

  handleTabChange = (event, newValue) => {
    this.setState({
      selectedTab: newValue,
      resetKey: this.state.resetKey + 1,
      cacheFiltersKey: `claimApprovalPage_tab_${newValue}`,
    });
    this.props.clearCurrentPaginationPage();
  };

  onDoubleClick = (c, newTab) => {
    const { modulesManager, history } = this.props;

    let path = modulesManager.getRoutePath
      ? modulesManager.getRoutePath("claim.route.claimReview")
      : "/claim/claimReview/:claim_uuid";

    path = path.replace(":claim_uuid", c.uuid);

    const query = "?mode=review";

    if (newTab) {
      const url = `${window.location.origin}/#${path}${query}`;
      window.open(url, "_blank");
    } else {
      history.push({
        pathname: path,
        search: query,
      });
    }
  };

  approveSelected = (selection) => {
    const { intl, approveClaims } = this.props;
    const ids = selection.map((c) => c.uuid);

    coreConfirm(
      formatMessage(intl, "claim", "approveClaim.confirm.title"),
      formatMessageWithValues(intl, "claim", "approveClaim.confirm.message", { count: selection.length }),
      () => {
        approveClaims(ids).then(() => {
          this.setState({ resetKey: this.state.resetKey + 1 });
          this.props.coreAlert(
            formatMessage(intl, "claim", "approveClaim.success.title"),
            formatMessage(intl, "claim", "approveClaim.success.message"),
          );
        });
      },
    );
  };

  submitSelectedToBranch = (selection) => {
    const { intl, submitToBranch, resubmitToBranch, coreAlert } = this.props;
    const { selectedTab } = this.state;

    const handleSuccess = () => {
      this.setState({ resetKey: this.state.resetKey + 1 });
      coreAlert(
        formatMessage(intl, "claim", "submitToBranch.success.title", "Success"),
        formatMessage(intl, "claim", "submitToBranch.success.message", "Claims submitted to branch successfully"),
      );
    };

    if (selectedTab === 1) {
      const idsToResubmit = [];
      const idsToSubmit = []; 

      selection.forEach((claim) => {
        const hasBranchReturn = claim.returnReasons && claim.returnReasons.some((r) => r.returnType === 18);

        if (hasBranchReturn) {
          idsToResubmit.push(claim.uuid);
        } else {
          idsToSubmit.push(claim.uuid);
        }
      });

      const promises = [];

      if (idsToResubmit.length > 0) {
        promises.push(resubmitToBranch(idsToResubmit, 21));
      }

      if (idsToSubmit.length > 0) {
        promises.push(submitToBranch(idsToSubmit));
      }

      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          handleSuccess();
        });
      }
    } else {
      const ids = selection.map((c) => c.uuid);
      submitToBranch(ids).then(() => {
        handleSuccess();
      });
    }
  };

  render() {
    const { classes, intl, rights } = this.props;
    const { selectedTab, resetKey, cacheFiltersKey } = this.state;

    const currentTabDef = this.tabDefinitions[selectedTab];
    const isActionableTab = selectedTab === 0 || selectedTab === 1;

    let actions = [];
    if (rights.includes(RIGHT_CLAIMREVIEW) && isActionableTab) {
      actions.push({
        label: "claimSummaries.actions.submitSelected",
        enabled: (selection) => selection && selection.length > 0,
        action: this.submitSelectedToBranch,
        icon: "send",
      });
    }

    return (
      <div className={classes.page}>
        <Helmet title={formatMessage(intl, "claim", "claimApproval.page.title", "Claim Approval")} />

        {/* Tabs for Workflow Stages */}
        <Paper className={classes.tabsRoot} square>
          <Tabs
            value={selectedTab}
            onChange={this.handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            className={classes.tabsFlexContainer}
          >
            {this.tabDefinitions.map((tab) => (
              <Tab
                key={tab.id}
                label={formatMessage(intl, "claim", tab.label, tab.defaultLabel)}
                className={classes.tabItem}
              />
            ))}
          </Tabs>
        </Paper>

        <ClaimPreparerSearcher
          key={`approver-searcher-${selectedTab}-${resetKey}`}
          defaultFilters={currentTabDef.filter}
          cacheFiltersKey={cacheFiltersKey}
          onDoubleClick={this.onDoubleClick}
          actions={actions}
          filterPaneContributionsKey={CLAIM_APPROVAL_FILTER_CONTRIBUTION_KEY}
          actionsContributionKey={CLAIM_APPROVAL_ACTION_CONTRIBUTION_KEY}
          showOrdinalNumber={true}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  user: state.core?.user,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchClaimSummaries,
      selectHealthFacility,
      submitToBranch,
      resubmitToBranch,
      clearCurrentPaginationPage,
      coreAlert,
    },
    dispatch,
  );
};

export default injectIntl(
  withModulesManager(
    withHistory(connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(ClaimApprovalPage)))),
  ),
);
