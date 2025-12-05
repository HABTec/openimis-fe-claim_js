import React, { Component, Fragment } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import _ from "lodash";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { IconButton, Typography, Tooltip, Badge } from "@material-ui/core";
import AttachIcon from "@material-ui/icons/AttachFile";
import TabIcon from "@material-ui/icons/Tab";
import CheckIcon from "@material-ui/icons/Check";
import { Searcher } from "@openimis/fe-core";
import ClaimPreparerFilter from "./ClaimPreparerFilter";
import {
  withModulesManager,
  formatMessageWithValues,
  formatMessage,
  formatDateFromISO,
  formatAmount,
  FormattedMessage,
  PublishedComponent,
} from "@openimis/fe-core";
import { fetchClaimSummaries } from "../actions";

const CLAIM_SEARCHER_CONTRIBUTION_KEY = "claim.Searcher";

const styles = (theme) => ({});

class ClaimPreparerSearcher extends Component {
  state = {
    random: null,
    attachmentsClaim: null,
  };

  constructor(props) {
    super(props);
    this.rowsPerPageOptions = props.modulesManager.getConf(
      "fe-claim",
      "claimFilter.rowsPerPageOptions",
      [10, 20, 50, 100],
    );
    this.defaultPageSize = props.modulesManager.getConf("fe-claim", "claimFilter.defaultPageSize", 10);
    this.highlightAmount = parseInt(props.modulesManager.getConf("fe-claim", "claimFilter.highlightAmount", 0));
    this.highlightAltInsurees = props.modulesManager.getConf("fe-claim", "claimFilter.highlightAltInsurees", true);
    this.claimAttachments = props.modulesManager.getConf("fe-claim", "claimAttachments", true);
    this.extFields = props.modulesManager.getConf("fe-claim", "extFields", []);
    this.showOrdinalNumber = props.modulesManager.getConf("fe-claim", "claimForm.showOrdinalNumber", false);
    this.showPreAuthorization = props.modulesManager.getConf("fe-claim", "showPreAuthorization", false);
  }

  canSelectAll = (selection) =>
    this.props.claims.map((s) => s.id).filter((s) => !selection.map((s) => s.id).includes(s)).length;

  fetch = (prms) => {
    this.props.fetchClaimSummaries(this.props.modulesManager, prms, !!this.claimAttachments);
  };

  rowIdentifier = (r) => r.uuid;

  forcedFilters() {
    return !this.props.forcedFilters ? [] : [...this.props.forcedFilters.filter((f) => f.id !== "random")];
  }

  filtersToQueryParams = (state) => {
    let prms = Object.keys(state.filters)
      .filter((f) => !!state.filters[f]["filter"])
      .map((f) => state.filters[f]["filter"]);
    let forced = this.forcedFilters();
    let random = state.filters["random"];
    if (forced.length > 0) {
      prms.push(...forced.map((f) => f.filter));
    }
    if (!!random) {
      prms.push(`first: ${random.value}`);
      prms.push(`orderBy: ["dateClaimed", "?"]`);
      this.setState({ random });
    } else {
      prms.push(`orderBy: ["${state.orderBy}"]`);
      this.setState({ random: null });
    }
    if (!forced.length && !random) {
      if (!state.beforeCursor && !state.afterCursor) {
        prms.push(`first: ${state.pageSize}`);
      }
      if (!!state.afterCursor) {
        prms.push(`after: "${state.afterCursor}"`);
        prms.push(`first: ${state.pageSize}`);
      }
      if (!!state.beforeCursor) {
        prms.push(`before: "${state.beforeCursor}"`);
        prms.push(`last: ${state.pageSize}`);
      }
    }
    return prms;
  };

  feedbackColFormatter = (c) =>
    !!this.props.feedbackColFormatter
      ? this.props.feedbackColFormatter(c)
      : formatMessage(this.props.intl, "claim", `feedbackStatus.${c.feedbackStatus}`);
  reviewColFormatter = (c) =>
    !!this.props.reviewColFormatter
      ? this.props.reviewColFormatter(c)
      : formatMessage(this.props.intl, "claim", `reviewStatus.${c.reviewStatus}`);

  preHeaders = (selection) => {
    var result = selection.length
      ? [
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          <Typography noWrap={true}>
            <FormattedMessage
              module="claim"
              id="claimSummaries.selection.claimed"
              values={{
                claimed: (
                  <b>
                    {formatAmount(
                      this.props.intl,
                      selection.reduce((acc, v) => {
                        if (v.claimed) {
                          return acc + parseFloat(v.claimed);
                        } else {
                          return acc;
                        }
                      }, 0),
                    )}
                  </b>
                ),
              }}
            />
          </Typography>,
          <Typography noWrap={true}>
            <FormattedMessage
              module="claim"
              id="claimSummaries.selection.approved"
              values={{
                approved: (
                  <b>
                    {formatAmount(
                      this.props.intl,
                      selection.reduce((acc, v) => {
                        if (v.approved) {
                          return acc + parseFloat(v.approved);
                        } else {
                          return acc;
                        }
                      }, 0),
                    )}
                  </b>
                ),
              }}
            />
          </Typography>,
          "",
          "",
        ]
      : ["\u200b", "", "", "", "", "", "", "", "", "", ""]; 
    if (this.claimAttachments) {
      result.push("");
    }
    this.extFields.forEach((f) => {
      result.push("");
    });
    return result;
  };

  headers = () => {
    var result = [
      "claimSummaries.code",
      "claimSummaries.healthFacility",
      "claimSummaries.insuree",
      "claimSummaries.claimedDate",
      "claimSummaries.processedDate",
      "claimSummaries.feedbackStatus",
      "claimSummaries.reviewStatus",
      "claimSummaries.claimed",
      "claimSummaries.approved",
      "claimSummaries.claimStatus",
    ];
    if (this.showPreAuthorization) {
      result.push("claim.claimSummaries.pre-authorization");
    }
    if (this.claimAttachments) {
      result.push("claimSummaries.claimAttachments");
    }
    if (!!this.extFields && !!this.extFields.length) {
      this.extFields.forEach((f) => {
        result.push(`claimSummaries.${f}`);
      });
    }
    result.push("claimSummaries.openNewTab");
    return result;
  };

  sorts = () => {
    const result = [];

    if (this.showOrdinalNumber) {
      result.push(null);
    }

    result.push(
      ["code", true],
      [this.props.modulesManager.getRef("location.HealthFacilityPicker.sort"), true],
      [this.props.modulesManager.getRef("insuree.InsureePicker.sort"), true],
      ["dateClaimed", true],
      null,
      null,
      null,
      ["claimed", false],
      ["approved", false],
    );

    if (this.claimAttachments) {
      result.push(null);
    }
    if (!!this.extFields && !!this.extFields.length) {
      this.extFields.forEach((f) => {
        result.push(null);
      });
    }
    return result;
  };

  aligns = () => {
    return [, , , , , , , "right", "right", ,];
  };

  itemFormatters = () => {
    var result = [
      (c) => c.code,
      (c) => (
        <PublishedComponent
          readOnly={true}
          pubRef="location.HealthFacilityPicker"
          withLabel={false}
          value={c.healthFacility}
        />
      ),
      (c) => <PublishedComponent readOnly={true} pubRef="insuree.InsureePicker" withLabel={false} value={c.insuree} />,
      (c) => formatDateFromISO(this.props.modulesManager, this.props.intl, c.dateClaimed),
      (c) => formatDateFromISO(this.props.modulesManager, this.props.intl, c.dateProcessed),
      (c) => this.feedbackColFormatter(c),
      (c) => this.reviewColFormatter(c),
      (c) => formatAmount(this.props.intl, c.claimed),
      (c) => formatAmount(this.props.intl, c.approved),
      (c) => formatMessage(this.props.intl, "claim", `claimStatus.${c.status}`),
    ];
    if (this.showPreAuthorization) {
      result.push((c) => (c.preAuthorization ? <CheckIcon /> : ""));
    }
    if (this.claimAttachments) {
      result.push(
        (c) =>
          !!c.attachmentsCount && (
            <IconButton onClick={(e) => this.setState({ attachmentsClaim: c })}>
              <Badge badgeContent={c.attachmentsCount ?? 0} color="primary">
                <AttachIcon />
              </Badge>
            </IconButton>
          ),
      );
    }
    if (!!this.extFields && !!this.extFields.length) {
      this.extFields.forEach((f) => {
        result.push((c) => (!!c.jsonExt ? String(_.get(JSON.parse(c.jsonExt), f, "-")) : ""));
      });
    }
    result.push((c) => (
      <Tooltip title={formatMessage(this.props.intl, "claim", "openNewTabButton.tooltip")}>
        <IconButton onClick={(e) => this.props.onDoubleClick(c, true)}>
          {" "}
          <TabIcon />
        </IconButton>
      </Tooltip>
    ));
    return result;
  };

  rowLocked = (selection, claim) => !!claim.clientMutationId;

  rowHighlighted = (selection, claim) => !!this.highlightAmount && claim.claimed > this.highlightAmount;

  rowHighlightedAlt = (selection, claim) =>
    !!this.highlightAltInsurees &&
    selection.filter((c) => _.isEqual(c.insuree, claim.insuree)).length && 
    !selection.includes(claim);

  isRestoredClaim = (claim) => claim?.restoreId;

  showRestored = (showRestored) => {
    this.setState({ showRestored });
  };

  isClaimNotRestored = (_, claim) => this.state.showRestored && !claim?.restoreId;

  render() {
    const {
      intl,
      claims,
      claimsPageInfo,
      fetchingClaims,
      fetchedClaims,
      errorClaims,
      FilterExt,
      filterPaneContributionsKey,
      actions,
      defaultFilters,
      cacheFiltersKey,
      onDoubleClick,
      actionsContributionKey,
    } = this.props;

    let count = !!this.state.random && this.state.random.value;
    if (!count) {
      count = (claimsPageInfo?.totalCount || 0).toLocaleString();
    }

    return (
      <Fragment>
        <PublishedComponent
          pubRef="claim.AttachmentsDialog"
          readOnly={true}
          claim={this.state.attachmentsClaim}
          close={(e) => this.setState({ attachmentsClaim: null })}
        />
        <Searcher
          module="claim"
          canSelectAll={this.canSelectAll}
          defaultFilters={defaultFilters}
          cacheFiltersKey={cacheFiltersKey}
          FilterPane={ClaimPreparerFilter}
          FilterExt={FilterExt}
          filterPaneContributionsKey={filterPaneContributionsKey}
          items={claims}
          itemsPageInfo={claimsPageInfo}
          fetchingItems={fetchingClaims}
          fetchedItems={fetchedClaims}
          errorItems={errorClaims}
          contributionKey={CLAIM_SEARCHER_CONTRIBUTION_KEY}
          tableTitle={formatMessageWithValues(intl, "claim", "claimSummaries", { count })}
          rowsPerPageOptions={this.rowsPerPageOptions}
          defaultPageSize={this.defaultPageSize}
          fetch={this.fetch}
          rowIdentifier={this.rowIdentifier}
          filtersToQueryParams={this.filtersToQueryParams}
          defaultOrderBy="-dateClaimed"
          rowLocked={this.rowLocked}
          rowHighlighted={this.rowHighlighted}
          rowHighlightedAlt={this.rowHighlightedAlt}
          rowSecondaryHighlighted={this.isRestoredClaim}
          withSelection="multiple"
          selectionMessage={"claimSummaries.selection.count"}
          preHeaders={this.preHeaders}
          headers={this.headers}
          itemFormatters={this.itemFormatters}
          actions={actions}
          aligns={this.aligns}
          sorts={this.sorts}
          onDoubleClick={onDoubleClick}
          actionsContributionKey={actionsContributionKey}
          showOrdinalNumber={this.showOrdinalNumber}
        />
      </Fragment>
    );
  }
}

const mapStateToProps = (state) => ({
  claims: state.claim.claims,
  claimsPageInfo: state.claim.claimsPageInfo,
  fetchingClaims: state.claim.fetchingClaims,
  fetchedClaims: state.claim.fetchedClaims,
  errorClaims: state.claim.errorClaims,
  servicesPricelists: !!state.medical_pricelist ? state.medical_pricelist.servicesPricelists : {},
  itemsPricelists: !!state.medical_pricelist ? state.medical_pricelist.itemsPricelists : {},
  userHealthFacilityFullPath: !!state.loc ? state.loc.userHealthFacilityFullPath : null,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ fetchClaimSummaries }, dispatch);
};

export default withModulesManager(
  connect(mapStateToProps, mapDispatchToProps)(injectIntl(withTheme(withStyles(styles)(ClaimPreparerSearcher)))),
);
