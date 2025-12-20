import { useState } from "react";
import "@radix-ui/themes/styles.css";
import { Flex, Container } from "@mantine/core";
import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import SubmitEntry from "./components/SubmitEntry";
import History from "@/components/History";
import Dashboard from "@/components/Dashboard";

function Layout() {
  return (
      <Flex style={{ height: '100vh' }}>
        <Sidebar />
        <Container style={{
          flex: 1,
          overflow: 'auto',
          padding: '2rem 5%',
          backgroundColor: 'white'
        }}>
          <Routes>
            <Route path="/" element={<Dashboard/>} />
            <Route path="/new-entry" element={<SubmitEntry />} />
            <Route path="/history" element={<History/>} />
          </Routes>
        </Container>
      </Flex>
  );
}

export default Layout;
