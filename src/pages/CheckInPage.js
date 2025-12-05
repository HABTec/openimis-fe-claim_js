import React, { Component } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { 
  PublishedComponent,
  historyPush, 
  withModulesManager, 
  withHistory 
} from "@openimis/fe-core";
import { withStyles } from "@material-ui/core/styles";

const styles = (theme) => ({
  page: theme.page,
});

class CheckInPage extends Component {
  
  onDoubleClick = (insuree) => {
    historyPush(
        this.props.modulesManager, 
        this.props.history, 
        "claim.route.checkInInsuree", 
        [insuree.uuid]                
    );
  };

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.page}>
       
        <PublishedComponent
          pubRef="insuree.components.InsureeSearcher" 
          onDoubleClick={this.onDoubleClick}
          cacheFiltersKey="claimCheckInFilters"
          searchInitiated={true}
        />
      </div>
    );
  }
}

export default withModulesManager(
  withHistory(connect(null, null)(withStyles(styles)(CheckInPage)))
);
