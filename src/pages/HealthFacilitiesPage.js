import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Fab, Tooltip, Tabs, Tab, Paper, Grid } from "@material-ui/core";
import { withTheme, withStyles } from "@material-ui/core/styles";
import _ from "lodash";
import AddIcon from "@material-ui/icons/Add";
import {
  withHistory,
  historyPush,
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  journalize,
  coreConfirm,
  Helmet,
  coreAlert,
  clearCurrentPaginationPage,
  PublishedComponent
} from "@openimis/fe-core";
import ClaimPreparerSearcher from "../components/ClaimPreparerSearcher";
import { submit, del, selectHealthFacility, submitAll, selectClaimAdmin } from "../actions";
import { RIGHT_ADD, RIGHT_LOAD, RIGHT_SUBMIT, RIGHT_DELETE, MODULE_NAME } from "../constants";

const CLAIM_HF_FILTER_CONTRIBUTION_KEY = "claim.HealthFacilitiesFilter";
const CLAIM_SEARCHER_ACTION_CONTRIBUTION_KEY = "claim.SelectionAction";

const styles = (theme) => ({
  page: theme.page,
  fab: theme.fab,
  tabsRoot: {
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper, 
    borderRadius: 4,
  },
  tabsFlexContainer: {
    display: 'flex'
  },
  tabItem: {
    flexGrow: 1,
    maxWidth: 'none'
  }
});

class HealthFacilitiesPage extends Component {
  constructor(props) {
    super(props);

    this.tabDefinitions = [
      {
        id: 0,
        label: "claimSummaries.tabs.checkedIn", 
        defaultLabel: "Checked-In",
        type: "insuree", 
        filter: { 
          "isCheckedIn": { "value": true, "filter": "isCheckedIn: true" } 
        } 
      },
      {
        id: 1,
        label: "claimSummaries.tabs.entered", 
        defaultLabel: "Entered",
        type: "claim",
        filter: { "claimStatus": { "value": 0, "filter": "status: 2"}
        } 
      },
      {
        id: 2,
        label: "claimSummaries.tabs.returnedFromBranch",
        defaultLabel: "Returned (Branch)",
        type: "claim",
        filter: { "claimStatus": { "value": 1, "filter": "status: 18" } } 
      },
      {
        id: 3,
        label: "claimSummaries.tabs.returnedFromFacility",
        defaultLabel: "Returned (Facility)",
        type: "claim",
        filter: { "claimStatus": { "value": 1, "filter": "status: 17" } } 
      },
      {
        id: 4,
        label: "claimSummaries.tabs.submitted",
        defaultLabel: "Submitted",
        type: "claim",
        filter: { "claimStatus": { "value": 2, "filter": "status: 19" } }
      },
      {
        id: 5, 
        label : "claimSummaries.tabs.resubmitted",
        defaultLabel : "Resubmitted",
        type : "claim",
        filter : { "claimStatus" : { "value" : 1, "filter" : "status: 20" } }
      },
      {
        id: 6,
        label: "claimSummaries.tabs.rejected",
        defaultLabel: "Rejected",
        type: "claim",
        filter: { "claimStatus": { "value": 3, "filter": "status: 1" } }
      }
    ];
    
    let defaultFilters = props.modulesManager.getConf("fe-claim", "healthFacilities.defaultFilters", 
      this.tabDefinitions[0].filter
    );
    this.canSubmitClaimWithZero = props.modulesManager.getConf("fe-claim", "canSubmitClaimWithZero", false);
    this.state = {
      selectedTab: 0,
      confirmedAction: null,
      resetKey: 0, 
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
      this.setState({ reset: this.state.reset + 1 });
    } else if (!prevProps.confirmed && this.props.confirmed) {
      this.state.confirmedAction();
    }
  }

  handleTabChange = (event, newValue) => {
    this.setState({
      selectedTab: newValue,
      currentFilters: this.tabDefinitions[newValue].filter,
      resetKey: this.state.resetKey + 1 
    });
    this.props.clearCurrentPaginationPage();
    this.props.selectHealthFacility(null);
  };

  canSubmitSelected = (selection) =>
    !!selection &&
    selection.length &&
    selection.filter((s) => (s.status === 2 || s.status === 1) && (!!this.canSubmitClaimWithZero || s.claimed > 0)).length ===
      selection.length;

  canSubmitAll = (selection) => !selection || selection.length == 0;

  submitSelected = (selection) => {
    // For both intial submission and resubmission
    const isResubmit = selection[0].status === 1; 
    const labelKey = isResubmit ? "ResubmitClaim.mutationLabel" : "SubmitClaim.mutationLabel";
    const pluralLabelKey = isResubmit ? "ResubmitClaims.mutationLabel" : "SubmitClaims.mutationLabel";
    if (selection.length === 1) {
      this.props.submit(
        selection,
        formatMessageWithValues(this.props.intl, "claim", labelKey, { code: selection[0].code }),
      );
    } else {
      this.props.submit(
        selection,
        formatMessageWithValues(this.props.intl, "claim", pluralLabelKey, { count: selection.length }),
        selection.map((c) => c.code),
      );
    }
  };

  submitAll = (selection) => {
    let filters = this.props.selectedFilters;
    if (selection.length === 0) {
      this.props.submitAll(
        filters,
        formatMessageWithValues(this.props.intl, "claim", "SubmitAllClaims.mutationLabel", { "claims": "All" }),
      );
    }
  };

  canDeleteSelected = (selection) =>
    !!selection && selection.length && selection.filter((s) => s.status === 2).length === selection.length;

  deleteSelected = (selection) => {
    let confirm = null;
    let confirmedAction = null;
    if (selection.length === 1) {
      confirmedAction = () =>
        this.props.del(
          selection,
          formatMessageWithValues(this.props.intl, "claim", "DeleteClaim.mutationLabel", { code: selection[0].code }),
        );
      confirm = (e) =>
        this.props.coreConfirm(
          formatMessage(this.props.intl, "claim", "deleteClaim.confirm.title"),
          formatMessageWithValues(this.props.intl, "claim", "deleteClaim.confirm.message", {
            code: selection[0].code,
          }),
        );
    } else {
      confirmedAction = () =>
        this.props.del(
          selection,
          formatMessageWithValues(this.props.intl, "claim", "DeleteClaims.mutationLabel", { count: selection.length }),
          selection.map((c) => c.code),
        );
      confirm = (e) =>
        this.props.coreConfirm(
          formatMessage(this.props.intl, "claim", "deleteClaims.confirm.title"),
          formatMessageWithValues(this.props.intl, "claim", "deleteClaims.confirm.message", {
            count: selection.length,
          }),
        );
    }

    this.setState({ confirmedAction }, confirm);
  };

  onDoubleClick = (c, newTab = false) => {
    historyPush(this.props.modulesManager, this.props.history, "claim.route.claimEdit", [c.uuid], newTab);
  };

  onInsureeDoubleClick = (insuree, newTab = false) => {
    // 1. Validation: Check if Claim Administrator is selected
    if (!this.props.claimAdmin) {
      this.props.coreAlert(
        formatMessage(this.props.intl, "claim", "validation.error"),
        formatMessage(this.props.intl, "claim", "newClaim.adminAndHFRequired")
      );
      return;
    }

   const path = this.props.modulesManager?.getRoutePath
  ? this.props.modulesManager.getRoutePath("claim.route.claimEdit")
  : "/claim/healthFacilities/claim/";

  this.props.history.push(path, { preSelectedInsuree: insuree });
  };

  onAdd = () => {
    historyPush(this.props.modulesManager, this.props.history, "claim.route.claimEdit");
  };

  canAdd = () => {
    if (!this.props.claimAdmin) return false;
    if (!this.props.claimHealthFacility) return false;
    return true;
  };

  componentDidMount = () => {
    const { module } = this.props;
    if (module !== MODULE_NAME) this.props.clearCurrentPaginationPage();
  };

  componentWillUnmount = () => {
    const { location, history } = this.props;
    const {
      location: { pathname },
    } = history;
    const urlPath = location.pathname;
    if (!pathname.includes(urlPath)) this.props.clearCurrentPaginationPage();
  };

  getPreparerDefaultFilters = () => {
    const { claimAdmin } = this.props;
    let defaultFilters = {};
    if (claimAdmin) {
      if (claimAdmin.uuid) {
        defaultFilters.admin = { id: "admin", value: claimAdmin, filter: `admin_Uuid: "${claimAdmin.uuid}"` };
      }
      if (claimAdmin.healthFacility) {
        const hf = claimAdmin.healthFacility;
        if (hf.uuid) {
          defaultFilters.healthFacility = { id: "healthFacility", value: hf, filter: `healthFacility_Uuid: "${hf.uuid}"` };
        }
        if (hf.location) {
          const district = hf.location;
          if (district.uuid) {
            defaultFilters.district = { id: "district", value: district, filter: `healthFacility_Location_Uuid: "${district.uuid}"` };
          }
          if (district.parent) {
            const region = district.parent;
            if (region.uuid) {
              defaultFilters.region = { id: "region", value: region, filter: `healthFacility_Location_Parent_Uuid: "${region.uuid}"` };
            }
          }
        }
      }
    }
    return defaultFilters;
  };

  render() {
    const { intl, classes, rights, generatingPrint } = this.props;
    const { selectedTab, resetKey } = this.state;
    const currentTabDef = this.tabDefinitions[selectedTab];
    const isInsureeTab = currentTabDef.type === "insuree";

    const preparerFilters = this.getPreparerDefaultFilters();
    
    const mergedDefaultFilters = isInsureeTab 
        ? { ...currentTabDef.filter } 
        : { ...currentTabDef.filter, ...preparerFilters }; 
    if (!rights.filter((r) => r >= RIGHT_ADD && r <= RIGHT_SUBMIT).length) return null;
    let actions = [];
    const isActionableTab = !isInsureeTab && (selectedTab === 1 || selectedTab === 2);

    if (isActionableTab) {
      if (rights.includes(RIGHT_SUBMIT)) {
        actions.push({ label: "claimSummaries.submitAll", enabled: this.canSubmitAll, action: this.submitAll });
        actions.push({
          label: "claimSummaries.submitSelected",
          enabled: this.canSubmitSelected,
          action: this.submitSelected,
        });
      }
      if (rights.includes(RIGHT_DELETE)) {
        actions.push({
          label: "claimSummaries.deleteSelected",
          enabled: this.canDeleteSelected,
          action: this.deleteSelected,
        });
      }
    }
    
    const dynamicCacheKey = `claimHealthFacilitiesPageFiltersCache_${selectedTab}`;
    return (
      <div className={classes.page}>
        <Helmet title={formatMessage(this.props.intl, "location", "location.healthFacilities.page.title")} />

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

        {isInsureeTab ? (<React.Fragment>
        
        <Paper className={classes.tabsRoot} style={{ padding: 16 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <PublishedComponent
                pubRef="claim.ClaimAdminPicker"
                label={formatMessage(intl, "claim", "ClaimFilter.claimAdmin")}
                value={this.props.claimAdmin} 
                onChange={(admin) => {
                    this.props.selectClaimAdmin(admin);
                    
                    if(admin && admin.healthFacility){
                        this.props.selectHealthFacility(admin.healthFacility);
                    }
                }}
                required={true}
              />
            </Grid>
            {/* Optional: Add Health Facility Picker if I need it*/}
          </Grid>
        </Paper>

        <PublishedComponent
          pubRef="insuree.components.InsureeSearcher"
          key={`insuree-searcher-${selectedTab}-${resetKey}`}
          defaultFilters={mergedDefaultFilters}
          cacheFiltersKey={dynamicCacheKey}
          onDoubleClick={rights.includes(RIGHT_LOAD) ? this.onInsureeDoubleClick : null}
          hideFilters={true}
          contributionKey="insuree.InsureeSearcher"
        />
      </React.Fragment>
        ) : (
          <ClaimPreparerSearcher
            key={`searcher-${selectedTab}-${resetKey}`}
            defaultFilters={mergedDefaultFilters}
            cacheFiltersKey={dynamicCacheKey}
            onDoubleClick={rights.includes(RIGHT_LOAD) ? this.onDoubleClick : null}
            actions={actions}
            processing={generatingPrint}
            filterPaneContributionsKey={CLAIM_HF_FILTER_CONTRIBUTION_KEY}
            actionsContributionKey={CLAIM_SEARCHER_ACTION_CONTRIBUTION_KEY}
          />
        )}

        {!generatingPrint && rights.includes(RIGHT_ADD) && (
          <Tooltip
            title={
              !this.canAdd()
                ? formatMessage(intl, "claim", "newClaim.adminAndHFRequired")
                : formatMessage(intl, "claim", "newClaim.tooltip")
            }
          >
            <div className={classes.fab}>
              <Fab color="primary" disabled={!this.canAdd()} onClick={this.onAdd}>
                <AddIcon />
              </Fab>
            </div>
          </Tooltip>
        )}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  claimAdmin: state.claim.claimAdmin,
  claimHealthFacility: state.claim.claimHealthFacility,
  userHealthFacilityFullPath: !!state.loc ? state.loc.userHealthFacilityFullPath : null,
  submittingMutation: state.claim.submittingMutation,
  mutation: state.claim.mutation,
  confirmed: state.core.confirmed,
  filtersCache: state.core.filtersCache,
  selectedFilters: state.core.filtersCache.claimHealthFacilitiesPageFiltersCache,
  module: state.core?.savedPagination?.module,
  user: state.core?.user,
  generatingPrint: state.claim.generatingPrint,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      selectHealthFacility,
      selectClaimAdmin,
      journalize,
      coreConfirm,
      coreAlert,
      submit,
      submitAll,
      del,
      clearCurrentPaginationPage,
    },
    dispatch,
  );
};

export default injectIntl(
  withModulesManager(
    withHistory(connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(HealthFacilitiesPage)))),
  ),
);
