import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

import React from "react";
import ReactDOM from "react-dom/client";
import Layout from "./Layout";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider, createTheme, Text, TextInput, Input} from "@mantine/core";

const theme = createTheme({
  primaryColor: "dark",
  defaultRadius: 12,
  });

const resolver: CSSVariablesResolver = (theme) => ({
  /** Shared CSS variables that should be accessible independent from color scheme */
  variables: {},
  /** CSS variables available only in dark color scheme */
  light: {
    '--mantine-color-text': '#000000',
  },
  /** CSS variables available only in light color scheme */
  dark: {
    '--mantine-color-text': '#FFFFFF',
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <MantineProvider defaultColorScheme="light" theme={theme} cssVariablesResolver={resolver}>
        <Layout />
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
