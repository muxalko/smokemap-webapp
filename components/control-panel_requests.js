import * as React from 'react';
import { useCallback} from "react";
// change to real requests data - think of pagination 
// has to be admin role to approve

import { CreateRequest } from './createRequest';
import ErrorBoundary from './ErrorBoundary';
import PlacesList from './placesLists';

import styled from "styled-components";

function ControlPanel(props) {

  const flyToLocation = useCallback((coordinates) => {
    const longitude = coordinates[0];
    const latitude = coordinates[1];
    console.log("flyToLocation fired ! { " + longitude + ", " + latitude + " }")
    props.onSelectRequest(longitude, latitude);
    },[]);

  return (
    <ControlPanelContainer>
        <ErrorBoundary>
      <h3>Add a new place</h3>
      <CreateRequest onClickHandler={flyToLocation} onSuccessfulCreation={flyToLocation} />
    </ErrorBoundary>
    <h4>Places</h4>
    <PlacesList onClickHandler={flyToLocation} />
    </ControlPanelContainer>
  );
}

export default React.memo(ControlPanel);

const ControlPanelContainer = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    max-width: 320px;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    padding: 12px 24px;
    margin: 20px;
    font-size: 13px;
    line-height: 2;
    color: #6b6b76;
    text-transform: uppercase;
    outline: none;
`