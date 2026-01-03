import React from 'react';
import { NavLink } from 'react-router-dom';
import { Stack, Box, Text, Divider, Group, UnstyledButton } from '@mantine/core';
import { Activity, PlusCircle, Calendar, BarChart3, Settings, Pill } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Activity },
    { path: '/new-entry', label: 'New Entry', icon: PlusCircle },
    { path: '/history', label: 'History', icon: Calendar },
    { path: '/medicines', label: 'Medicines', icon: Pill },
  ];

  return (
    <Box
      style={{
        width: '250px',
        height: '100vh',
        borderRight: '1px solid var(--mantine-color-gray-3)',
        backgroundColor: 'var(--mantine-color-gray-0)',
        padding: '1.5rem 1rem',
      }}
    >
      <Stack gap="md">
        <Box mb="xs">
          <Text size="xl" fw={700}>
            Migraine Diary
          </Text>
        </Box>

        <Divider />

        <Stack gap="xs" mt="xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{ textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <UnstyledButton
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--mantine-radius-md)',
                      backgroundColor: isActive ? 'var(--mantine-color-blue-1)' : 'transparent',
                      color: isActive ? 'var(--mantine-color-blue-7)' : 'var(--mantine-color-gray-9)',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Group gap="sm">
                      <Icon size={20} />
                      <Text size="sm" fw={isActive ? 700 : 400}>
                        {item.label}
                      </Text>
                    </Group>
                  </UnstyledButton>
                )}
              </NavLink>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
};

export default Sidebar;
