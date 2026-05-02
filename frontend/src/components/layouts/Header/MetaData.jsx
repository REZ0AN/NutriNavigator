import React from "react";
import { Helmet } from "react-helmet";

const MetaData = ({ title }) => (
  <Helmet>
    <title>{title} | NutriNavigator</title>
  </Helmet>
);

export default MetaData;
