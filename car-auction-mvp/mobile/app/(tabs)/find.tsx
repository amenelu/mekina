import { Redirect } from "expo-router";
import React from "react";

const FindCarProxyScreen = () => {
  // This component will not render anything.
  // It immediately redirects the user to the screen in the /request folder.
  return <Redirect href="/request" />;
};

export default FindCarProxyScreen;
