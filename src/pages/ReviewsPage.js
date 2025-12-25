import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Grid, InputAdornment, IconButton, Tooltip, Tabs, Tab, Paper } from "@material-ui/core";
import FilterIcon from "@material-ui/icons/FilterList";
import FeedbackIcon from "@material-ui/icons/SpeakerNotesOutlined";
import ReviewIcon from "@material-ui/icons/SupervisorAccount";
import {
  formatMessage,
  formatMessageWithValues,
  AmountInput,
  NumberInput,
  withHistory,
  historyPush,
  withModulesManager,
  PublishedComponent,
  journalize,
  coreAlert,
  Helmet,
  clearCurrentPaginationPage,
  Contributions,
} from "@openimis/fe-core";
import ClaimSearcher from "../components/ClaimSearcher";
import {
  selectHealthFacility,
  selectForFeedback,
  bypassFeedback,
  skipFeedback,
  selectForReview,
  bypassReview,
  deliverReview,
  skipReview,
  process,
  changeClaimStatus,
} from "../actions";
import { RIGHT_UPDATE, RIGHT_FEEDBACK, RIGHT_CLAIMREVIEW, RIGHT_PROCESS, MODULE_NAME } from "../constants";
import { withTheme, withStyles } from "@material-ui/core/styles";

const CLAIM_REVIEWS_FILTER_CONTRIBUTION_KEY = "claim.ReviewsFilter";
const CLAIM_REVIEWS_ACTION_CONTRIBUTION_KEY = "claim.ReviewSelectionAction";
const CLAIM_SAMPLING_BATCH_CONTRIBUTION_KEY = "claimSampling.claimSamplingButton";

const styles = (theme) => ({
  page: theme.page,
  item: {
    padding: theme.spacing(1),
  },
  toggledButton: {
    backgroundColor: theme.palette.toggledButton,
  },
  tabsRoot: {
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: 4,
  },
  tabsFlexContainer: {
    display: "flex",
  },
  tabItem: {
    flexGrow: 1,
    maxWidth: "none",
  },
});

class RawRandomAndValueFilters extends Component {
  state = {
    randomToggled: false,
    random: 0,
    valueToggled: false,
    value: 0,
    variance: 0,
    filters: {},
  };

  componentDidMount() {
    let state = this.props.modulesManager.getConf("fe-claim", "claim.ReviewsPage.initState", {
      random: 5,
      value: 0,
      variance: 10,
    });
    this.setState({ ...state });
  }

  randomChange = (v) => {
    let filters = this.state.filters;
    delete filters.random;
    this.setState({
      random: parseFloat(v),
      randomToggled: false,
      filters,
    });
  };
  valueChange = (v) => {
    let filters = this.state.filters;
    delete filters.value;
    this.setState({
      value: parseFloat(v),
      valueToggled: false,
      filters,
    });
  };
  varianceChange = (v) => {
    let filters = this.state.filters;
    delete filters.value;
    this.setState({
      variance: parseFloat(v),
      varianceToggled: false,
      filters,
    });
  };
  toggleRandomFilter = (e) => {
    let filters = this.state.filters;
    if (this.state.random > 100 || this.state.random < 1) {
      this.props.coreAlert(
        formatMessage(this.props.intl, "claim", "ClaimFilter.randomFilter.invalidAlert.title"),
        formatMessageWithValues(this.props.intl, "claim", "ClaimFilter.randomFilter.invalidAlert.message", {
          random: this.state.random,
        }),
      );
      return;
    }
    let rnd = Math.trunc((this.state.random * this.props.claimsPageInfo.totalCount) / 100);
    if (!this.state.randomToggled && !rnd) {
      this.props.coreAlert(
        formatMessage(this.props.intl, "claim", "ClaimFilter.randomFilter.zeroAlert.title"),
        formatMessageWithValues(this.props.intl, "claim", "ClaimFilter.randomFilter.zeroAlert.message", {
          random: this.state.random,
          totalCount: this.props.claimsPageInfo.totalCount,
        }),
      );
      return;
    }
    if (!this.state.randomToggled) {
      filters.random = [
        {
          id: "random",
          value: rnd,
        },
      ];
    } else {
      filters.random = [
        {
          id: "random",
          value: null,
        },
      ];
    }
    this.setState(
      (state) => ({
        filters,
        randomToggled: !state.randomToggled,
      }),
      (e) => this.props.onChangeFilters(Object.values(this.state.filters).flat()),
    );
  };
  toggleValueFilter = (e) => {
    let filters = this.state.filters;
    if (!!this.state.valueToggled) {
      filters.value = [
        { id: "value", value: null },
        {
          id: "claimedAbove",
          value: null,
        },
      ];
    } else {
      filters.value = [
        { id: "value", value: this.state.value },
        {
          id: "claimedAbove",
          value: this.state.value,
          filter: `claimed_Gte: "${this.state.value}"`,
        },
      ];
    }
    this.setState(
      (state) => ({
        filters,
        valueToggled: !state.valueToggled,
      }),
      (e) => this.props.onChangeFilters(Object.values(this.state.filters).flat()),
    );
  };
  toggleVarianceFilter = (e) => {
    let filters = this.state.filters;
    if (!!this.state.varianceToggled) {
      filters.value = [
        { id: "variance", value: null },
        {
          id: "diagnosisVariance",
          value: null,
        },
      ];
    } else {
      filters.value = [
        { id: "value", value: this.state.value },
        {
          id: "diagnosisVariance",
          value: this.state.variance,
          filter: `diagnosisVariance: ${this.state.variance}`,
        },
      ];
    }
    this.setState(
      (state) => ({
        filters,
        varianceToggled: !state.varianceToggled,
      }),
      (e) => this.props.onChangeFilters(Object.values(this.state.filters).flat()),
    );
  };
  render() {
    const { classes, filters } = this.props;
    const { filters: additionalFilters } = this.state;
    const allFilters = { ...filters, ...additionalFilters };

    return (
      <Grid container direction="row">
        <Grid item xs={3} className={classes.item}>
          <NumberInput
            module="claim"
            label="ClaimFilter.Reviews.random"
            name="random"
            value={this.state.random}
            onChange={this.randomChange}
            startAdornment={<InputAdornment position="start">%</InputAdornment>}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  className={!!this.state.randomToggled ? classes.toggledButton : null}
                  onClick={this.toggleRandomFilter}
                  edge="end"
                >
                  <FilterIcon />
                </IconButton>
              </InputAdornment>
            }
            inputProps={{
              step: 10,
              min: 0,
              max: 100,
              type: "number",
            }}
          />
        </Grid>
        <Grid item xs={3} className={classes.item}>
          <AmountInput
            module="claim"
            label="ClaimFilter.Reviews.value"
            value={this.state.value}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  className={!!this.state.valueToggled ? classes.toggledButton : null}
                  onClick={this.toggleValueFilter}
                  edge="end"
                >
                  <FilterIcon />
                </IconButton>
              </InputAdornment>
            }
            onChange={this.valueChange}
          />
        </Grid>
        <Grid className={classes.item} xs={3}>
          <NumberInput
            module="claim"
            label="ClaimFilter.Reviews.variance"
            value={this.state.variance}
            onChange={this.varianceChange}
            startAdornment={<InputAdornment position="start">%</InputAdornment>}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  className={!!this.state.varianceToggled ? classes.toggledButton : null}
                  onClick={this.toggleVarianceFilter}
                  edge="end"
                >
                  <FilterIcon />
                </IconButton>
              </InputAdornment>
            }
            inputProps={{
              step: 10,
              min: 0,
              max: 100,
              type: "number",
            }}
          />
        </Grid>
        <Contributions contributionKey={CLAIM_SAMPLING_BATCH_CONTRIBUTION_KEY} filters={allFilters} />
      </Grid>
    );
  }
}

const mapStateToFixFilterProps = (state) => ({
  claimsPageInfo: state.claim.claimsPageInfo,
});

const mapDispatchToFixFilterProps = (dispatch) => {
  return bindActionCreators(
    {
      coreAlert,
    },
    dispatch,
  );
};

const RandomAndValueFilters = withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(connect(mapStateToFixFilterProps, mapDispatchToFixFilterProps)(RawRandomAndValueFilters)),
    ),
  ),
);

class ReviewsPage extends Component {
  constructor(props) {
    super(props);
    this.tabDefinitions = [
      {
        id: 0,
        label: "claimSummaries.tabs.submittedFromHead",
        defaultLabel: "Submitted From Head",
        type: "claim",
        filter: { "claimStatus": { "value": 0, "filter": "status: 4" } },
      },
      {
        id: 1,
        label: "claimSummaries.tabs.flagged",
        defaultLabel: "Flagged",
        type: "claim",
        filter: { "claimStatus": { "value": 2, "filter": "status: 22" } },
      },
      {
        id: 2,
        label: "claimSummaries.tabs.resubmittedFromHead",
        defaultLabel: "Resubmitted From Head",
        type: "claim",
        filter: { "claimStatus": { "value": 2, "filter": "status: 21" } },
      },
      {
        id: 3,
        label: "claimSummaries.tabs.approved",
        defaultLabel: "Approved",
        type: "claim",
        filter: { "claimStatus": { "value": 3, "filter": "status: 16" } },
      },
      {
        id: 4,
        label: "claimSummaries.tabs.rejected",
        defaultLabel: " Rejected",
        type: "claim",
        filter: { "claimStatus": { "value": 4, "filter": "status: 1" } },
      },
    ];

    const defaultFilters = props.modulesManager.getConf(
      "fe-claim",
      "reviews.defaultFilters",
      this.tabDefinitions[0].filter,
    );

    this.state = {
      selectedTab: 0,
      currentFilters: defaultFilters,
      resetKey: 0,
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
      this.setState((prevState) => ({ resetKey: prevState.resetKey + 1 }));
    }
  }

  _labelMutation = (selection, labelOne, labelMultiple, action) => {
    if (selection.length === 1) {
      action(selection, formatMessageWithValues(this.props.intl, "claim", labelOne, { code: selection[0].code }));
    } else {
      action(
        selection,
        formatMessageWithValues(this.props.intl, "claim", labelMultiple, { count: selection.length }),
        selection.map((c) => c.code),
      );
    }
  };

  canMarkSelectedForFeedback = (selection) =>
    !!selection &&
    selection.length &&
    selection.filter((s) => s.feedbackStatus <= 2).length === selection.length &&
    selection.filter((s) => s.status === 4).length === selection.length;

  markSelectedForFeedback = (selection) => {
    this._labelMutation(
      selection,
      "SelectClaimForFeedback.mutationLabel",
      "SelectClaimsForFeedback.mutationLabel",
      this.props.selectForFeedback,
    );
  };

  canMarkBypassedFeedback = (selection) =>
    !!selection &&
    selection.length &&
    selection.filter((s) => s.feedbackStatus === 4).length === selection.length &&
    selection.filter((s) => s.status === 4).length === selection.length;

  markBypassedFeedback = (selection) => {
    this._labelMutation(
      selection,
      "BypassClaimFeedback.mutationLabel",
      "BypassClaimsFeedback.mutationLabel",
      this.props.bypassFeedback,
    );
  };

  canMarkSkippedFeedback = (selection) =>
    !!selection && selection.length && selection.filter((s) => s.status === 4).length === selection.length;

  markSkippedFeedback = (selection) => {
    this._labelMutation(
      selection,
      "SkipClaimFeedback.mutationLabel",
      "SkipClaimsFeedback.mutationLabel",
      this.props.skipFeedback,
    );
  };

  handleTabChange = (event, newValue) => {
    this.setState({
      selectedTab: newValue,
      currentFilters: this.tabDefinitions[newValue].filter,
      resetKey: this.state.resetKey + 1,
    });

    this.props.clearCurrentPaginationPage();
    console.log("Updated to tab:", newValue);
  };

  canMarkSelectedForReview = (selection) =>
    !!selection &&
    selection.length &&
    selection.filter((s) => s.reviewStatus <= 2).length === selection.length &&
    selection.filter((s) => s.status === 4).length === selection.length;

  markSelectedForReview = (selection) => {
    this._labelMutation(
      selection,
      "SelectClaimForReview.mutationLabel",
      "SelectClaimsForReview.mutationLabel",
      this.props.selectForReview,
    );
  };

  canApproveSelected = (selection) =>
    !!selection && selection.length > 0 && selection.every((s) => s.status === 4);

  approveSelected = (selection) => {
    const uuids = selection.map((s) => s.uuid);
    this._labelMutation(
      selection,
      "claimSummaries.approve.mutationLabel",
      "claimSummaries.approve.mutationLabelMultiple",
      (sel, label) => this.props.changeClaimStatus(uuids, 16, label)
    );
  };

  
  canFlagSelected = (selection) =>
    !!selection && selection.length > 0 && selection.every((s) => s.status === 4);

  flagSelected = (selection) => {
    const uuids = selection.map((s) => s.uuid);
    this._labelMutation(
      selection,
      "claimSummaries.flag.mutationLabel",
      "claimSummaries.flag.mutationLabelMultiple",
      (sel, label) => this.props.changeClaimStatus(uuids, 22, label)
    );
  };

  canMarkBypassedReview = (selection) =>
    !!selection &&
    selection.length &&
    selection.filter((s) => s.reviewStatus === 4).length === selection.length &&
    selection.filter((s) => s.status === 4).length === selection.length;

  markBypassedReview = (selection) => {
    this._labelMutation(
      selection,
      "BypassClaimReview.mutationLabel",
      "BypassClaimsReview.mutationLabel",
      this.props.bypassReview,
    );
  };

  canMarkDeliveredReview = (selection) =>
    !!selection &&
    selection.length &&
    selection.filter((s) => s.reviewStatus === 4).length === selection.length &&
    selection.filter((s) => s.status === 4).length === selection.length;

  markDeliveredReview = (selection) => {
    this._labelMutation(
      selection,
      "DeliverClaimReview.mutationLabel",
      "DeliverClaimsReview.mutationLabel",
      this.props.deliverReview,
    );
  };

  canMarkSkippedReview = (selection) =>
    !!selection &&
    selection.length &&
    selection.filter((s) => s.reviewStatus === 4).length === selection.length &&
    selection.filter((s) => s.status === 4).length === selection.length;

  markSkippedReview = (selection) => {
    this._labelMutation(
      selection,
      "SkipClaimReview.mutationLabel",
      "SkipClaimsReview.mutationLabel",
      this.props.skipReview,
    );
  };

  canProcessSelected = (selection) =>
    !!selection && selection.length && selection.filter((s) => s.status === 4).length === selection.length;

  processSelected = (selection) => {
    this._labelMutation(selection, "ProcessClaim.mutationLabel", "ProcessClaims.mutationLabel", this.props.process);
  };

  buildExtraAction = (one_label, many_label, action) => {
    let f = (selection) => this._labelMutation(selection, one_label, many_label, action);
    return f;
  };

  onChangeFeedbackStatus = (c, v) => {
    c.feedbackStatus = v;
    switch (v) {
      case 2:
        this.props.skipFeedback(
          [c],
          formatMessageWithValues(this.props.intl, "claim", "SkipClaimFeedback.mutationLabel", { code: c.code }),
        );
        break;
      case 4:
        this.props.selectForFeedback(
          [c],
          formatMessageWithValues(this.props.intl, "claim", "SelectClaimForFeedback.mutationLabel", { code: c.code }),
        );
        break;
      case 16:
        this.props.bypassFeedback(
          [c],
          formatMessageWithValues(this.props.intl, "claim", "BypassClaimFeedback.mutationLabel", { code: c.code }),
        );
        break;
      default:
        console.log("Illegal new Feedback Status " + v);
    }
  };
  provideFeedback = (c) => historyPush(this.props.modulesManager, this.props.history, "claim.route.feedback", [c.uuid]);

  feedbackColFormatter = (c) => (
    <Grid container justify="flex-end" alignItems="center">
      <Grid item>
        <PublishedComponent
          pubRef="claim.FeedbackStatusPicker"
          withLabel={false}
          name="feedbackStatus"
          withNull={false}
          filtered={[1, 8]}
          value={c.feedbackStatus}
          readOnly={!this.props.rights.includes(RIGHT_UPDATE) || c.status !== 4}
          onChange={(v, s) => this.onChangeFeedbackStatus(c, v)}
        />
      </Grid>
      {!!this.props.rights.includes(RIGHT_FEEDBACK) && (
        <Grid item>
          <Tooltip title={formatMessage(this.props.intl, "claim", "feedbackButton.tooltip")}>
            <IconButton onClick={(e) => this.provideFeedback(c)}>
              <FeedbackIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      )}
    </Grid>
  );

  onChangeReviewStatus = (c, v) => {
    c.reviewStatus = v;
    switch (v) {
      case 2:
        this.props.skipReview(
          [c],
          formatMessageWithValues(this.props.intl, "claim", "SkipClaimReview.mutationLabel", { code: c.code }),
        );
        break;
      case 4:
        this.props.selectForReview(
          [c],
          formatMessageWithValues(this.props.intl, "claim", "SelectClaimForReview.mutationLabel", { code: c.code }),
        );
        break;
      case 8:
        this.props.deliverReview(
          [c],
          formatMessageWithValues(this.props.intl, "claim", "DeliverClaimReview.mutationLabel", { code: c.code }),
        );
        break;
      case 16:
        this.props.bypassReview(
          [c],
          formatMessageWithValues(this.props.intl, "claim", "BypassClaimReview.mutationLabel", { code: c.code }),
        );
        break;
      default:
        console.log("Illegal new Review Status " + v);
    }
  };
  review = (c, newTab = false) =>
    historyPush(this.props.modulesManager, this.props.history, "claim.route.review", [c.uuid], newTab);
  reviewStatusFilter = (claim) => {
    switch (claim.reviewStatus) {
      case 1:
        return [1, 8, 16];
      case 2:
        return [1, 2, 8, 16];
      case 4:
        return [1, 4];
      case 8:
        return [1, 2, 4, 8, 16];
      case 16:
        return [1, 2, 4, 8, 16];
      default:
        console.log("Illegal Review Status " + claim.reviewStatus);
    }
  };
  reviewColFormatter = (c) => (
    <Grid container justify="flex-end" alignItems="center">
      <Grid item>
        <PublishedComponent
          pubRef="claim.ReviewStatusPicker"
          withLabel={false}
          name="reviewStatus"
          value={c.reviewStatus}
          withNull={false}
          filtered={this.reviewStatusFilter(c)}
          readOnly={!this.props.rights.includes(RIGHT_UPDATE) || c.status !== 4 || c.reviewStatus >= 8}
          onChange={(v, s) => this.onChangeReviewStatus(c, v)}
        />
      </Grid>
      {!!this.props.rights.includes(RIGHT_CLAIMREVIEW) && (
        <Grid item>
          <Tooltip title={formatMessage(this.props.intl, "claim", "reviewButton.tooltip")}>
            <IconButton onClick={(e) => this.review(c)}>
              <ReviewIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      )}
    </Grid>
  );

  onDoubleClick = (c, newTab = false) => {
    this.review(c, newTab);
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

  render() {
    const { classes, rights } = this.props;
    const { selectedTab, resetKey } = this.state;
    const currentFilters = this.state.currentFilters
    console.log("branch state look", this.state, currentFilters.claimStatus)
    if (!rights.filter((r) => r >= RIGHT_CLAIMREVIEW && r <= RIGHT_PROCESS).length) return null;
    let actions = [];
    if (rights.includes(RIGHT_UPDATE) && (selectedTab === 0 || selectedTab === 2)) {
      actions.push(
        {
          label: "claimSummaries.approveSelected",
          enabled: this.canApproveSelected,
          action: this.approveSelected,
        },
        {
          label: "claimSummaries.flagSelected",
          enabled: this.canFlagSelected,
          action: this.flagSelected,
        }
      );
    }
    // actions used prior to the customization

    
    // if (rights.includes(RIGHT_UPDATE)) {
    //   actions.push(
    //     {
    //       label: "claimSummaries.markSelectedForFeedback",
    //       enabled: this.canMarkSelectedForFeedback,
    //       action: this.markSelectedForFeedback,
    //     },
    //     {
    //       label: "claimSummaries.markBypassedFeedback",
    //       enabled: this.canMarkBypassedFeedback,
    //       action: this.markBypassedFeedback,
    //     },
    //     {
    //       label: "claimSummaries.markSkippedFeedback",
    //       enabled: this.canMarkSkippedFeedback,
    //       action: this.markSkippedFeedback,
    //     },
    //     {
    //       label: "claimSummaries.markSelectedForReview",
    //       enabled: this.canMarkSelectedForReview,
    //       action: this.markSelectedForReview,
    //     },
    //     {
    //       label: "claimSummaries.markBypassedReview",
    //       enabled: this.canMarkBypassedReview,
    //       action: this.markBypassedReview,
    //     },
    //     {
    //       label: "claimSummaries.markDeliveredReview",
    //       enabled: this.canMarkDeliveredReview,
    //       action: this.markDeliveredReview,
    //     },
    //     {
    //       label: "claimSummaries.markSkippedReview",
    //       enabled: this.canMarkSkippedReview,
    //       action: this.markSkippedReview,
    //     },
    //   );
    // }
    // if (rights.includes(RIGHT_PROCESS)) {
    //   actions.push({
    //     label: "claimSummaries.processSelected",
    //     enabled: this.canProcessSelected,
    //     action: this.processSelected,
    //   });
    // }

    const dynamicCacheKey = `claimReviewsPageFiltersCache_${selectedTab}`;
    return (
      <div className={classes.page}>
        <Helmet title={formatMessage(this.props.intl, "claim", "claim.reviews.page.title")} />
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
                label={formatMessage(this.props.intl, "claim", tab.label, tab.defaultLabel)}
                className={classes.tabItem}
              />
            ))}
          </Tabs>
        </Paper>

        <ClaimSearcher
          key={`reviewSearcher- ${selectedTab}-${resetKey}`}
          // defaultFilters={this.state.defaultFilters}
          defaultFilters={currentFilters}
          cacheFiltersKey={dynamicCacheKey}
          FilterExt={RandomAndValueFilters}
          actions={actions}
          onDoubleClick={rights.includes(RIGHT_UPDATE) ? this.onDoubleClick : null}
          feedbackColFormatter={this.feedbackColFormatter}
          reviewColFormatter={this.reviewColFormatter}
          filterPaneContributionsKey={CLAIM_REVIEWS_FILTER_CONTRIBUTION_KEY}
          actionsContributionKey={CLAIM_REVIEWS_ACTION_CONTRIBUTION_KEY}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  claimAdmin: state.claim.claimAdmin,
  claimHealthFacility: state.claim.claimHealthFacility,
  userHealthFacilityFullPath: !!state.loc ? state.loc.userHealthFacilityFullPath : null,
  claimsPageInfo: state.claim.claimsPageInfo,
  module: state.core?.savedPagination?.module,
  //props used from super.componentDidUpdate !!
  submittingMutation: state.claim.submittingMutation,
  mutation: state.claim.mutation,
  //--
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      selectHealthFacility,
      journalize,
      selectForFeedback,
      bypassFeedback,
      skipFeedback,
      selectForReview,
      bypassReview,
      deliverReview,
      skipReview,
      process,
      clearCurrentPaginationPage,
      changeClaimStatus,
    },
    dispatch,
  );
};

export default injectIntl(
  withHistory(connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(ReviewsPage)))),
);
