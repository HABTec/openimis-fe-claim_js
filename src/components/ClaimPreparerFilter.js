import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import _ from "lodash";
import _debounce from "lodash/debounce";
import { injectIntl } from "react-intl";

import { Grid, Divider, Checkbox, FormControlLabel } from "@material-ui/core";
import { withTheme, withStyles } from "@material-ui/core/styles";

import {
  formatMessage,
  withModulesManager,
  ControlledField,
  PublishedComponent,
  TextInput,
  AmountInput,
  Contributions,
} from "@openimis/fe-core";
import { selectClaimAdmin, selectHealthFacility, selectDistrict, selectRegion } from "../actions";

const CLAIM_FILTER_CONTRIBUTION_KEY = "claim.Filter";

const styles = (theme) => ({
  dialogTitle: theme.dialog.title,
  dialogContent: theme.dialog.content,
  form: {
    padding: 0,
  },
  item: {
    padding: theme.spacing(1),
  },
  paperDivider: theme.paper.divider,
});

class Head extends Component {
  state = {
    reset: 0,
  };

  _filterValue = (k) => {
    const { filters } = this.props;
    return !!filters[k] ? filters[k].value : null;
  };

  _regionFilter = (v) => {
    if (!!v) {
      return {
        id: "region",
        value: v,
        filter: `healthFacility_Location_Parent_Uuid: "${v.uuid}"`,
      };
    } else {
      return { id: "region", value: null, filter: null };
    }
  };

  _districtFilter = (v) => {
    if (!!v) {
      return {
        id: "district",
        value: v,
        filter: `healthFacility_Location_Uuid: "${v.uuid}"`,
      };
    } else {
      return { id: "district", value: null, filter: null };
    }
  };

  _healthFacilityFilter = (v) => {
    if (!!v) {
      return {
        id: "healthFacility",
        value: v,
        filter: `healthFacility_Uuid: "${v.uuid}"`,
      };
    } else {
      return { id: "healthFacility", value: null, filter: null };
    }
  };

  _claimAdminFilter = (v) => {
    if (!!v) {
      return {
        id: "admin",
        value: v,
        filter: `admin_Uuid: "${v.uuid}"`,
      };
    } else {
      return { id: "admin", value: null, filter: null };
    }
  };

  _claimBatchRunFilter = (v) => {
    if (!!v) {
      return {
        id: "batchRun",
        value: v,
        filter: `batchRun_Id: "${v.id}"`,
      };
    } else {
      return { id: "batchRun", value: null, filter: null };
    }
  };

  _onChangeRegion = (v, s) => {
    this.props.onChangeFilters([
      this._regionFilter(v),
      this._districtFilter(null),
      this._healthFacilityFilter(null),
      this._claimAdminFilter(null),
      this._claimBatchRunFilter(null),
    ]);
    this.setState((state) => ({
      reset: state.reset + 1,
    }));
    this.props.selectRegion(v);
  };

  _onChangeDistrict = (v, s) => {
    this.props.onChangeFilters([
      this._regionFilter(!!v ? v.parent : this._filterValue("region")),
      this._districtFilter(v),
      this._healthFacilityFilter(null),
      this._claimAdminFilter(null),
      this._claimBatchRunFilter(null),
    ]);
    this.setState({
      reset: this.state.reset + 1,
    });
    this.props.selectDistrict(v);
  };

  _onChangeHealthFacility = (v, s) => {
    this.props.onChangeFilters([
      this._regionFilter(!!v ? v.location.parent : this._filterValue("region")),
      this._districtFilter(!!v ? v.location : this._filterValue("district")),
      this._healthFacilityFilter(v),
      this._claimAdminFilter(null),
      this._claimBatchRunFilter(null),
    ]);
    this.setState((state) => ({
      reset: this.state.reset + 1,
    }));
    this.props.selectHealthFacility(v);
  };

  _onChangeClaimAdmin = (v, s) => {
    this.props.onChangeFilters([
      this._regionFilter(!!v ? v.healthFacility.location.parent : this._filterValue("region")),
      this._districtFilter(!!v ? v.healthFacility.location : this._filterValue("district")),
      this._healthFacilityFilter(!!v ? v.healthFacility : this._filterValue("healthFacility")),
      this._claimAdminFilter(v),
    ]);
    this.setState((state) => ({
      reset: this.state.reset + 1,
    }));
    this.props.selectClaimAdmin(v);
  };

  render() {
    const { classes, filters, onChangeFilters, userHealthFacilityId } = this.props;
    return (
      <Grid container className={classes.form}>
        <ControlledField
          module="claim"
          id="ClaimFilter.region"
          field={
            <Grid item xs={2} className={classes.item}>
              <PublishedComponent
                pubRef="location.RegionPicker"
                value={this._filterValue("region")}
                withNull={true}
                onChange={this._onChangeRegion}
              />
            </Grid>
          }
        />
        <ControlledField
          module="claim"
          id="ClaimFilter.district"
          field={
            <Grid item xs={2} className={classes.item}>
              <PublishedComponent
                pubRef="location.DistrictPicker"
                value={this._filterValue("district")}
                region={this._filterValue("region")}
                withNull={true}
                reset={this.state.reset}
                onChange={this._onChangeDistrict}
              />
            </Grid>
          }
        />
        <ControlledField
          module="claim"
          id="ClaimFilter.healthFacility"
          field={
            <Grid item xs={3} className={classes.item}>
              <PublishedComponent
                pubRef="location.HealthFacilityPicker"
                value={this._filterValue("healthFacility")}
                region={this._filterValue("region")}
                district={this._filterValue("district")}
                reset={this.state.reset}
                onChange={this._onChangeHealthFacility}
              />
            </Grid>
          }
        />
        <ControlledField
          module="claim"
          id="ClaimFilter.claimAdmin"
          field={
            <Grid item xs={2} className={classes.item}>
              <PublishedComponent
                pubRef="claim.ClaimAdminPicker"
                value={this._filterValue("admin")}
                withNull={true}
                hfFilter={this._filterValue("healthFacility")}
                reset={this.state.reset}
                onChange={this._onChangeClaimAdmin}
                region={this._filterValue("region")}
                district={this._filterValue("district")}
                required={true}
              />
            </Grid>
          }
        />
        <ControlledField
          module="claim"
          id="ClaimFilter.batchRun"
          field={
            <Grid item xs={3} className={classes.item}>
              {!userHealthFacilityId && (
                <PublishedComponent
                  pubRef="claim_batch.BatchRunPicker"
                  value={!!filters["batchRun"] ? filters["batchRun"]["value"] : null}
                  withNull={true}
                  scopeRegion={!!filters["region"] ? filters["region"]["value"] : null}
                  scopeDistrict={!!filters["district"] ? filters["district"]["value"] : null}
                  reset={this.state.reset}
                  onChange={(v, s) => onChangeFilters([this._claimBatchRunFilter(v)])}
                />
              )}
            </Grid>
          }
        />
      </Grid>
    );
  }
}

const mapStateToProps = (state) => ({
  userHealthFacilityId: state.core.user.i_user.health_facility_id,
  claimFilter: state.claim.claimFilter,
  servicesPricelists: !!state.medical_pricelist ? state.medical_pricelist.servicesPricelists : {},
  itemsPricelists: !!state.medical_pricelist ? state.medical_pricelist.itemsPricelists : {},
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      selectClaimAdmin,
      selectHealthFacility,
      selectDistrict,
      selectRegion,
    },
    dispatch,
  );
};

const BoundHead = connect(mapStateToProps, mapDispatchToProps)(Head);

class Details extends Component {
  constructor(props) {
    super(props);
    this.showPreAuthorization = props.modulesManager.getConf("fe-claim", "showPreAuthorization", false);
  }

  debouncedOnChangeFilter = _debounce(
    this.props.onChangeFilters,
    this.props.modulesManager.getConf("fe-claim", "debounceTime", 200),
  );

  _filterTextFieldValue = (k) => {
    const { filters } = this.props;
    return !!filters && !!filters[k] ? filters[k].value : "";
  };

  render() {
    const { intl, classes, filters, onChangeFilters, filterPaneContributionsKey = null, FilterExt } = this.props;
    return (
      <Grid container className={classes.form}>
        <Grid item xs={2} className={classes.item}>
          <TextInput
            module="claim"
            label="ClaimFilter.claimNo"
            name="claimNo"
            value={this._filterTextFieldValue("claimNo")}
            onChange={(v) =>
              this.debouncedOnChangeFilter([
                {
                  id: "claimNo",
                  value: v,
                  filter: !!v ? `code_Icontains: "${v}"` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={3} className={classes.item}>
          <TextInput
            module="claim"
            label="ClaimFilter.insureeCHFID"
            name="chfId"
            value={this._filterTextFieldValue("chfId")}
            onChange={(v) =>
              this.debouncedOnChangeFilter([
                {
                  id: "chfId",
                  value: v,
                  filter: !!v ? `insuree_ChfId: "${v}"` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={2} className={classes.item}>
          <AmountInput
            module="claim"
            label="ClaimFilter.claimedAbove"
            name="claimedAbove"
            value={filters["claimedAbove"] && filters["claimedAbove"]["value"]}
            onChange={(v) =>
              this.debouncedOnChangeFilter([
                {
                  id: "claimedAbove",
                  value: !v ? null : v,
                  filter: !!v ? `claimed_Gte: "${parseFloat(v)}"` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={2} className={classes.item}>
          <AmountInput
            module="claim"
            label="ClaimFilter.claimedUnder"
            name="claimedUnder"
            value={filters["claimedUnder"] && filters["claimedUnder"]["value"]}
            onChange={(v) =>
              this.debouncedOnChangeFilter([
                {
                  id: "claimedUnder",
                  value: !v ? null : v,
                  filter: !!v ? `claimed_Lte: "${parseFloat(v)}"` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={3}>
          <Grid container>
            <Grid item xs={6} className={classes.item}>
              <PublishedComponent
                pubRef="core.DatePicker"
                value={(filters["visitDateFrom"] && filters["visitDateFrom"]["value"]) || null}
                module="claim"
                label="visitDateFrom"
                onChange={(d) =>
                  onChangeFilters([
                    {
                      id: "visitDateFrom",
                      value: d,
                      filter: !!d ? `dateFrom_Gte: "${d}"` : null,
                    },
                  ])
                }
              />
            </Grid>
            <Grid item xs={6} className={classes.item}>
              <PublishedComponent
                pubRef="core.DatePicker"
                value={(filters["visitDateTo"] && filters["visitDateTo"]["value"]) || null}
                module="claim"
                label="visitDateTo"
                onChange={(d) =>
                  onChangeFilters([
                    {
                      id: "visitDateTo",
                      value: d,
                      filter: !!d ? `dateTo_Lte: "${d}"` : null,
                    },
                  ])
                }
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={3}>
          <Grid container>
            <Grid item xs={6} className={classes.item}>
              <PublishedComponent
                pubRef="core.DatePicker"
                value={(filters["claimDateFrom"] && filters["claimDateFrom"]["value"]) || null}
                module="claim"
                label="ClaimFilter.claimedDateFrom"
                onChange={(d) =>
                  onChangeFilters([
                    {
                      id: "claimDateFrom",
                      value: d,
                      filter: !!d ? `dateClaimed_Gte: "${d}"` : null,
                    },
                  ])
                }
              />
            </Grid>
            <Grid item xs={6} className={classes.item}>
              <PublishedComponent
                pubRef="core.DatePicker"
                value={(filters["claimDateTo"] && filters["claimDateTo"]["value"]) || null}
                module="claim"
                label="ClaimFilter.claimedDateTo"
                onChange={(d) =>
                  onChangeFilters([
                    {
                      id: "claimDateTo",
                      value: d,
                      filter: !!d ? `dateClaimed_Lte: "${d}"` : null,
                    },
                  ])
                }
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={3}>
          <Grid container>
            <Grid item xs={6} className={classes.item}>
              <PublishedComponent
                pubRef="core.DatePicker"
                value={(filters["processedDateFrom"] && filters["processedDateFrom"]["value"]) || null}
                module="claim"
                label="ClaimFilter.processedDateFrom"
                onChange={(d) =>
                  onChangeFilters([
                    {
                      id: "processedDateFrom",
                      value: d,
                      filter: !!d ? `dateProcessed_Gte: "${d}"` : null,
                    },
                  ])
                }
              />
            </Grid>
            <Grid item xs={6} className={classes.item}>
              <PublishedComponent
                pubRef="core.DatePicker"
                value={(filters["processedDateTo"] && filters["processedDateTo"]["value"]) || null}
                module="claim"
                label="ClaimFilter.processedDateTo"
                onChange={(d) =>
                  onChangeFilters([
                    {
                      id: "processedDateTo",
                      value: d,
                      filter: !!d ? `dateProcessed_Lte: "${d}"` : null,
                    },
                  ])
                }
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={3} className={classes.item}>
          <PublishedComponent
            pubRef="medical.ServicePicker"
            value={(filters["medicalService"] && filters["medicalService"]["value"]) || null}
            name="medicalService"
            label={formatMessage(intl, "claim", "medicalService")}
            onChange={(v, s) =>
              onChangeFilters([
                {
                  id: "medicalService",
                  value: v,
                  filter: !!v ? `services: ["${!!v && v.code}"]` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={3} className={classes.item}>
          <PublishedComponent
            pubRef="medical.ItemPicker"
            value={(filters["medicalItem"] && filters["medicalItem"]["value"]) || null}
            name="medicalItem"
            label={formatMessage(intl, "claim", "medicalItem")}
            onChange={(v, s) =>
              onChangeFilters([
                {
                  id: "medicalItem",
                  value: v,
                  filter: !!v ? `items: ["${!!v && v.code}"]` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={3} className={classes.item}>
          <PublishedComponent
            pubRef="medical.DiagnosisPicker"
            name="mainDiagnosis"
            label={formatMessage(intl, "claim", "mainDiagnosis")}
            value={(filters["mainDiagnosis"] && filters["mainDiagnosis"]["value"]) || null}
            onChange={(v, s) =>
              onChangeFilters([
                {
                  id: "mainDiagnosis",
                  value: v,
                  filter: !!v ? `icd_Id: "${!!v && v.id}"` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={3} className={classes.item}>
          <PublishedComponent
            pubRef="medical.VisitTypePicker"
            name="visitType"
            value={(filters["visitType"] && filters["visitType"]["value"]) || null}
            onChange={(v, s) =>
              onChangeFilters([
                {
                  id: "visitType",
                  value: v,
                  filter: !!v ? `visitType: "${v}"` : null,
                },
              ])
            }
          />
        </Grid>
        <Grid item xs={1} className={classes.item}>
          <PublishedComponent
            pubRef="claim.CareTypePicker"
            name="careType"
            value={(filters["careType"] && filters["careType"]["value"]) || null}
            onChange={(value) => {
              onChangeFilters([
                {
                  id: "careType",
                  value: value,
                  filter: !!value ? `careType: "${value}"` : null,
                },
              ]);
            }}
          />
        </Grid>
        <Grid item xs={1} className={classes.item}>
          <PublishedComponent
            pubRef="claim.AttachmentStatusPicker"
            name="attachmentStatus"
            value={(filters["attachmentStatus"] && filters["attachmentStatus"]["value"]) || null}
            onChange={(value) =>
              onChangeFilters([
                {
                  id: "attachmentStatus",
                  value: value,
                  filter: !!value ? `attachmentStatus: ${value}` : null,
                },
              ])
            }
          />
        </Grid>
        {this.showPreAuthorization && (
          <Grid item xs={1} className={classes.item}>
            <PublishedComponent
              pubRef="claim.YesNoPicker"
              name="preAuthorization"
              value={filters["preAuthorization"] ? filters["preAuthorization"]["value"] : null}
              onChange={(value) =>
                onChangeFilters([
                  {
                    id: "preAuthorization",
                    value: value,
                    filter: value === null || value === "" ? null : `preAuthorization: ${value}`,
                  },
                ])
              }
            />
          </Grid>
        )}
        <Grid item xs={1} className={classes.item}>
          <ControlledField
            module="claim"
            field={
              <Grid item xs={2} className={classes.item}>
                <FormControlLabel
                  control={
                    <Checkbox
                      color="primary"
                      checked={(filters["showRestored"] && filters["showRestored"]["value"]) || false}
                      onChange={(event) =>
                        onChangeFilters([
                          {
                            id: "showRestored",
                            value: event.target.checked,
                            filter: !!event.target.checked ? `showRestored: ${event.target.checked}` : null,
                          },
                        ])
                      }
                    />
                  }
                  label={formatMessage(intl, "claim", "showRestored")}
                />
              </Grid>
            }
          />
        </Grid>
        <Contributions
          filters={filters}
          onChangeFilters={onChangeFilters}
          contributionKey={CLAIM_FILTER_CONTRIBUTION_KEY}
        />
        {!!filterPaneContributionsKey && (
          <Contributions
            filters={filters}
            onChangeFilters={onChangeFilters}
            contributionKey={filterPaneContributionsKey}
          />
        )}
        {!!FilterExt && (
          <Fragment>
            <Grid item xs={12} className={classes.paperDivider}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <FilterExt onChangeFilters={onChangeFilters} filters={filters} />
            </Grid>
          </Fragment>
        )}
      </Grid>
    );
  }
}

class ClaimFilter extends Component {
  render() {
    const { classes } = this.props;
    return (
      <form className={classes.container} noValidate autoComplete="off">
        <BoundHead {...this.props} />
        <Details {...this.props} />
      </form>
    );
  }
}

export default withModulesManager(injectIntl(withTheme(withStyles(styles)(ClaimFilter))));
