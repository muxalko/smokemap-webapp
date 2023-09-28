import React, { useState, useEffect} from 'react';
import MapComponent from '../components/MapComponent';
import styled from "styled-components";

export default function Index() {
  
    return ( 
      <>
        <Navbar>
          <Header>Smokemap {process.env.NEXT_PUBLIC_VERSION}</Header>
        </Navbar>
        <MapContainer>
          <MapComponent/>
        </MapContainer>
        <Clearfix />
    </>
    )
  }

const Navbar = styled.div`
  margin: 0;
  padding: 0px;
  background-color: black;
  color: white;
  text-align: center;
`;

const Header = styled.h1`
  padding: 20px;
  margin: 0;
`;

// Styled map container
const MapContainer = styled.div`
  width: 100%;
  height: 100vh;
  float: left;
`;

// Styled control elements container
const ControlContainer = styled.div`
  width: 25%;
  height: 100vh;
  float: left;
  box-sizing: border-box;
  padding: 20px;
`;

// Styled clearfix
const Clearfix = styled.div`
  &:after {
    content: "";
    display: table;
    clear: both;
  }
`;
