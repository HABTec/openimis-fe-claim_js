import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import {
  useModulesManager,
  useTranslations,
  Autocomplete,
  useGraphqlQuery,
} from "@openimis/fe-core";
import { DEFAULT } from "../constants";


const ClaimAdminPicker = (props) => {
  const {
    onChange,
    readOnly,
    required,
    withLabel = true,
    withPlaceholder,
    value,
    label,
    filterOptions,
    filterSelectedOptions,
    placeholder,
    multiple,
    extraFragment,
    hfFilter,
    region,
    district,
  } = props;
  const userHealthFacilityId = useSelector((state) =>
    state?.loc?.userHealthFacilityFullPath?.uuid
  );

  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations("claim", modulesManager);
  const [searchString, setSearchString] = useState("");
  const renderLastNameFirst = modulesManager.getConf(
    "fe-insuree",
    "renderLastNameFirst",
    DEFAULT.RENDER_LAST_NAME_FIRST,
  );

  const { isLoading, data, error } = useGraphqlQuery(
    `
      query ClaimAdminPicker ($search: String, $hf: String, $region_uuid: String, $district_uuid: String) {
          claimAdmins(search: $search, first: 20, healthFacility_Uuid: $hf, regionUuid: $region_uuid, districtUuid: $district_uuid) {
              edges {
                  node {
                      id
                      uuid
                      code
                      lastName
                      otherNames
                      healthFacility {
                          id uuid code name level
                          servicesPricelist{id, uuid}, itemsPricelist{id, uuid}, labServicesPricelist{id, uuid}
                          location {
                              id
                              uuid
                              code
                              name
                              parent {
                                code name id uuid
                              }
                          }
                      }
                      ${extraFragment ?? ""}
                    }
                }
            }
        }
        `,
    {
      hf: userHealthFacilityId || hfFilter?.uuid,
      search: searchString,
      region_uuid: region?.uuid,
      district_uuid: district?.uuid
    },
  );

  const formatClaimAdmin = (claimAdmin) => {
    return renderLastNameFirst
      ? `${claimAdmin.code} ${claimAdmin.lastName} ${claimAdmin.otherNames}`
      : `${claimAdmin.code} ${claimAdmin.otherNames} ${claimAdmin.lastName}`;
  };

  return (
    <Autocomplete
      multiple={multiple}
      required={required}
      placeholder={placeholder ?? formatMessage("ClaimAdminPicker.placeholder")}
      label={label ?? formatMessage("ClaimAdminPicker.label")}
      error={error}
      withLabel={withLabel}
      withPlaceholder={withPlaceholder}
      readOnly={readOnly}
      options={data?.claimAdmins?.edges.map((edge) => edge.node) ?? []}
      isLoading={isLoading}
      value={value}
      getOptionLabel={(option) => formatClaimAdmin(option)}
      onChange={(option) => onChange(option, option ? `${option.code} ${option.lastName} ${option.otherNames}` : null)}
      filterOptions={filterOptions}
      filterSelectedOptions={filterSelectedOptions}
      onInputChange={setSearchString}
    />
  );
};

export default ClaimAdminPicker;
