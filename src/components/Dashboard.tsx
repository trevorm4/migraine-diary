import React, { useState, useEffect } from "react";
import {
  Stack,
  Text,
  Card,
  Group,
  Loader,
  Center,
  Grid,
  Box,
} from "@mantine/core";
import { LineChart } from "@mantine/charts";
import DatePicker from "@/components/DatePicker";
import { invoke } from "@tauri-apps/api/core";
import { HeadacheLocation } from "@/lib/types";
import { HEADACHE_COLORS } from "@/lib/constants";

interface Entry {
  id: number;
  start_dt: string;
  end_dt: string;
  description: string;
  severity: number;
  headache_location: HeadacheLocation;
}

interface HeadacheStats {
  type: HeadacheLocation;
  avgDuration: number;
  avgSeverity: number;
  count: number;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const calculateOverallStats = (entries: Entry[]) => {
  if (entries.length === 0) return null;

  const totalDuration = entries.reduce((sum, entry) => {
    const duration = (new Date(entry.end_dt).getTime() - new Date(entry.start_dt).getTime()) / (1000 * 60);
    return sum + duration;
  }, 0);

  const totalSeverity = entries.reduce((sum, entry) => sum + entry.severity, 0);

  return {
    totalHeadaches: entries.length,
    avgDuration: totalDuration / entries.length,
    avgSeverity: totalSeverity / entries.length,
    totalDuration: totalDuration,
  };
};

function OverallStatsCard({ stats }: { stats: ReturnType<typeof calculateOverallStats> }) {
  if (!stats) return null;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <Stack gap="sm">
        <Text fw={700} size="xl" c="white">
          Overall Statistics
        </Text>

        <Group justify="space-between">
          <Text size="sm" c="white" opacity={0.9}>
            Total Headaches:
          </Text>
          <Text size="lg" fw={600} c="white">
            {stats.totalHeadaches}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="white" opacity={0.9}>
            Average Duration:
          </Text>
          <Text size="lg" fw={600} c="white">
            {formatDuration(stats.avgDuration)}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="white" opacity={0.9}>
            Average Severity:
          </Text>
          <Text size="lg" fw={600} c="white">
            {stats.avgSeverity.toFixed(1)}/10
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="white" opacity={0.9}>
            Total Duration:
          </Text>
          <Text size="lg" fw={600} c="white">
            {formatDuration(stats.totalDuration)}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

const calculateStatsByType = (entries: Entry[]): HeadacheStats[] => {
  const statsByType: Record<HeadacheLocation, { totalDuration: number; totalSeverity: number; count: number }> = {} as any;

  entries.forEach((entry) => {
    const duration = (new Date(entry.end_dt).getTime() - new Date(entry.start_dt).getTime()) / (1000 * 60); // minutes

    if (!statsByType[entry.headache_location]) {
      statsByType[entry.headache_location] = {
        totalDuration: 0,
        totalSeverity: 0,
        count: 0,
      };
    }

    statsByType[entry.headache_location].totalDuration += duration;
    statsByType[entry.headache_location].totalSeverity += entry.severity;
    statsByType[entry.headache_location].count += 1;
  });

  return Object.entries(statsByType).map(([type, stats]) => ({
    type: type as HeadacheLocation,
    avgDuration: stats.totalDuration / stats.count,
    avgSeverity: stats.totalSeverity / stats.count,
    count: stats.count,
  }));
};

const prepareChartData = (entries: Entry[]) => {
  // Group entries by date
  const groupedByDate: Record<string, { severities: number[]; type: HeadacheLocation }> = {};

  entries.forEach((entry) => {
    const dateKey = new Date(entry.start_dt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = { severities: [], type: entry.headache_location };
    }

    groupedByDate[dateKey].severities.push(entry.severity);
  });

  // Calculate average severity for each day and sort by date
  return Object.entries(groupedByDate)
    .map(([date, data]) => ({
      date: date,
      severity: data.severities.reduce((sum, s) => sum + s, 0) / data.severities.length,
      count: data.severities.length,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

function StatsCard({ stats }: { stats: HeadacheStats }) {
  const color = HEADACHE_COLORS[stats.type];

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <Box
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
          <Text fw={600} size="lg">
            {stats.type}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Average Duration:
          </Text>
          <Text size="sm" fw={500}>
            {formatDuration(stats.avgDuration)}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Average Severity:
          </Text>
          <Text size="sm" fw={500}>
            {stats.avgSeverity.toFixed(1)}/10
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total Occurrences:
          </Text>
          <Text size="sm" fw={500}>
            {stats.count}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

const Dashboard: React.FC = () => {
  // Calculate default date range (last 2 weeks)
  const getDefaultDateRange = (): [string, string] => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    return [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ];
  };

  const [dateRange, setDateRange] = useState<[string | null, string | null]>(
    getDefaultDateRange()
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!dateRange[0] || !dateRange[1]) {
        setEntries([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Parse dates as local time
        const startDate = new Date(dateRange[0] + 'T00:00:00');
        const endDate = new Date(dateRange[1] + 'T23:59:59.999');

        const requestData = {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        };

        const result = await invoke("get_entries", {
          request: requestData,
        });
        setEntries(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch entries");
        console.error("Error fetching entries:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [dateRange]);

  const stats = entries.length > 0 ? calculateStatsByType(entries) : [];
  const chartData = entries.length > 0 ? prepareChartData(entries) : [];
  const overallStats = entries.length > 0 ? calculateOverallStats(entries) : null;

  return (
    <Stack>
      <Text size="xl" fw={700}>
        Headache Dashboard
      </Text>

      <Center>
        <DatePicker
          label="Date Range"
          placeholder="Select date range"
          value={dateRange}
          onChange={setDateRange}
          defaultValue={getDefaultDateRange()}
          rangePicker
        />
      </Center>

      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      {loading && (
        <Group justify="center" mt="xl">
          <Loader size="lg" />
        </Group>
      )}

      {!loading && entries.length === 0 && dateRange[0] && dateRange[1] && (
        <Text c="dimmed" ta="center" mt="xl">
          No entries found for the selected date range
        </Text>
      )}

      {!loading && entries.length > 0 && (
        <Stack gap="xl" mt="md">
          {/* Overall Statistics */}
          <OverallStatsCard stats={overallStats} />

          {/* Statistics by Type */}
          <div>
            <Text size="lg" fw={600} mb="md">
              Statistics by Headache Type
            </Text>
            <Grid>
              {stats.map((stat) => (
                <Grid.Col key={stat.type} span={{ base: 12, sm: 6, md: 4 }}>
                  <StatsCard stats={stat} />
                </Grid.Col>
              ))}
            </Grid>
          </div>

          {/* Severity Over Time Chart */}
          <div>
            <Text size="lg" fw={600} mb="md">
              Severity Over Time
            </Text>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <LineChart
                h={300}
                data={chartData}
                dataKey="date"
                series={[{ name: "severity", color: "blue.6" }]}
                curveType="linear"
                yAxisProps={{ domain: [0, 10], label: "Severity" }}
                tooltipProps={{
                  content: ({ label, payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <Card padding="xs" shadow="md" withBorder>
                        <Stack gap={4}>
                          <Text size="sm" fw={500}>
                            {label}
                          </Text>
                          <Text size="sm">
                            Avg Severity: {typeof data.severity === 'number' ? data.severity.toFixed(1) : data.severity}
                          </Text>
                          {data.count > 1 && (
                            <Text size="xs" c="dimmed">
                              ({data.count} headaches)
                            </Text>
                          )}
                        </Stack>
                      </Card>
                    );
                  },
                }}
              />
            </Card>
          </div>
        </Stack>
      )}
    </Stack>
  );
};

export default Dashboard;
