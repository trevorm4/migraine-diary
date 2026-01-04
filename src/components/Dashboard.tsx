import React, { useState, useEffect } from "react";
import {
  Stack,
  Text,
  Card,
  Group,
  Loader,
  Grid,
  Box,
  Table,
} from "@mantine/core";
import { LineChart } from "@mantine/charts";
import DatePicker from "@/components/DatePicker";
import { invoke } from "@tauri-apps/api/core";

enum MedicineType {
  Preventative = "Preventative",
  Acute = "Acute",
}

interface Medicine {
  id: number;
  name: string;
  medicine_type: MedicineType;
  description: string;
}

interface MedicineEntry {
  id: number;
  medicine_id: number;
  quantity: number;
  timestamp: string;
}

interface Entry {
  id: number;
  start_dt: string;
  end_dt: string;
  description: string;
  severity: number;
  headache_location: string;
}

interface HeadacheStats {
  type: string;
  avgDuration: number;
  avgSeverity: number;
  count: number;
}

interface MedicineStats {
  medicineId: number;
  medicineName: string;
  medicineType: MedicineType;
  totalQuantity: number;
  usageCount: number;
  avgQuantityPerUse: number;
}

const HEADACHE_COLORS: Record<string, string> = {
  Temple: "#FF6B6B",
  Forehead: "#4ECDC4",
  Back: "#45B7D1",
  Side: "#FFA07A",
  Top: "#98D8C8",
  Eye: "#F7DC6F",
  Sinus: "#BB8FCE",
  Tension: "#85C1E2",
  Cluster: "#F8B739",
};

interface GetMedicationEntriesRequest {
  medicine_id: number;
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
    const duration =
      (new Date(entry.end_dt).getTime() - new Date(entry.start_dt).getTime()) /
      (1000 * 60);
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

const calculateStatsByType = (entries: Entry[]): HeadacheStats[] => {
  const statsByType: Record<
    string,
    { totalDuration: number; totalSeverity: number; count: number }
  > = {};

  entries.forEach((entry) => {
    const duration =
      (new Date(entry.end_dt).getTime() - new Date(entry.start_dt).getTime()) /
      (1000 * 60);

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
    type: type,
    avgDuration: stats.totalDuration / stats.count,
    avgSeverity: stats.totalSeverity / stats.count,
    count: stats.count,
  }));
};

const prepareChartData = (entries: Entry[]) => {
  const groupedByDate: Record<
    string,
    { severities: number[]; type: string }
  > = {};

  entries.forEach((entry) => {
    const dateKey = new Date(entry.start_dt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = {
        severities: [],
        type: entry.headache_location,
      };
    }

    groupedByDate[dateKey].severities.push(entry.severity);
  });

  return Object.entries(groupedByDate)
    .map(([date, data]) => ({
      date: date,
      severity:
        data.severities.reduce((sum, s) => sum + s, 0) / data.severities.length,
      count: data.severities.length,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const calculateMedicineStats = (
  medicines: Medicine[],
  allEntries: Map<number, MedicineEntry[]>,
  startDate: Date,
  endDate: Date
): MedicineStats[] => {
  return medicines
    .map((medicine) => {
      const entries = allEntries.get(medicine.id) || [];

      // Filter entries within date range
      const filteredEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });

      if (filteredEntries.length === 0) return null;

      const totalQuantity = filteredEntries.reduce(
        (sum, entry) => sum + entry.quantity,
        0
      );

      return {
        medicineId: medicine.id,
        medicineName: medicine.name,
        medicineType: medicine.medicine_type,
        totalQuantity,
        usageCount: filteredEntries.length,
        avgQuantityPerUse: totalQuantity / filteredEntries.length,
      };
    })
    .filter((stat): stat is MedicineStats => stat !== null);
};

function OverallStatsCard({
  stats,
}: {
  stats: ReturnType<typeof calculateOverallStats>;
}) {
  if (!stats) return null;

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
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

function HeadacheStatsCard({ stats }: { stats: HeadacheStats }) {
  const color = HEADACHE_COLORS[stats.type] || "#888";

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

function MedicineStatsCard({ stats }: { stats: MedicineStats }) {
  const typeColor =
    stats.medicineType === MedicineType.Acute ? "#f59f00" : "#37b24d";

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <Box
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: typeColor,
              flexShrink: 0,
            }}
          />
          <Text fw={600} size="lg">
            {stats.medicineName}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Type:
          </Text>
          <Text size="sm" fw={500}>
            {stats.medicineType}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Times Used:
          </Text>
          <Text size="sm" fw={500}>
            {stats.usageCount}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total Quantity:
          </Text>
          <Text size="sm" fw={500}>
            {stats.totalQuantity}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Avg Per Use:
          </Text>
          <Text size="sm" fw={500}>
            {stats.avgQuantityPerUse.toFixed(1)}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

const Dashboard: React.FC = () => {
  const getDefaultDateRange = (): [string, string] => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);

    return [
      startDate.toISOString().split("T")[0],
      endDate.toISOString().split("T")[0],
    ];
  };

  const [dateRange, setDateRange] = useState<[string | null, string | null]>(
    getDefaultDateRange()
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineEntries, setMedicineEntries] = useState<
    Map<number, MedicineEntry[]>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const result = await invoke<Medicine[]>("get_medications");
        setMedicines(result);

        // Fetch entries for all medicines
        const entriesMap = new Map<number, MedicineEntry[]>();
        await Promise.all(
          result.map(async (medicine) => {
            try {
              const request: GetMedicationEntriesRequest = {
                medicine_id: medicine.id,
              };
              const entries = await invoke<MedicineEntry[]>(
                "get_medication_entries",
                { request }
              );
              entriesMap.set(medicine.id, entries);
            } catch (err) {
              console.error(
                `Failed to fetch entries for medicine ${medicine.id}:`,
                err
              );
            }
          })
        );
        setMedicineEntries(entriesMap);
      } catch (err) {
        console.error("Failed to fetch medications:", err);
      }
    };

    fetchMedicines();
  }, []);

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
        const startDate = new Date(dateRange[0] + "T00:00:00");
        const endDate = new Date(dateRange[1] + "T23:59:59.999");

        const requestData = {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        };

        const result = await invoke("get_entries", {
          request: requestData,
        });
        setEntries(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch entries"
        );
        console.error("Error fetching entries:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [dateRange]);

  const overallStats =
    entries.length > 0 ? calculateOverallStats(entries) : null;

  const headacheStats = entries.length > 0 ? calculateStatsByType(entries) : [];
  const chartData = entries.length > 0 ? prepareChartData(entries) : [];

  const medicineStats =
    medicines.length > 0 && dateRange[0] && dateRange[1]
      ? calculateMedicineStats(
          medicines,
          medicineEntries,
          new Date(dateRange[0] + "T00:00:00"),
          new Date(dateRange[1] + "T23:59:59.999")
        )
      : [];

  return (
    <Stack>
      <Text size="xl" fw={700}>
        Headache Dashboard
      </Text>

      <Group justify="center">
        <DatePicker
          label="Date Range"
          placeholder="Select date range"
          value={dateRange}
          onChange={setDateRange}
          defaultValue={getDefaultDateRange()}
          rangePicker
        />
      </Group>

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
          <OverallStatsCard stats={overallStats} />

          <div>
            <Text size="lg" fw={600} mb="md">
              Statistics by Headache Type
            </Text>
            <Grid>
              {headacheStats.map((stat) => (
                <Grid.Col
                  key={stat.type}
                  span={{ base: 12, sm: 6, md: 4 }}
                >
                  <HeadacheStatsCard stats={stat} />
                </Grid.Col>
              ))}
            </Grid>
          </div>

          <div>
            <Text size="lg" fw={600} mb="md">
              Severity Over Time
            </Text>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <LineChart
                h={300}
                w="100%"
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
                      <Card padding="xs" shadow="md" withBorder bg="white">
                        <Stack gap={4}>
                          <Text size="sm" fw={500}>
                            {label}
                          </Text>
                          <Text size="sm">
                            Avg Severity:{" "}
                            {typeof data.severity === "number"
                              ? data.severity.toFixed(1)
                              : data.severity}
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

      {!loading && medicineStats.length > 0 && (
        <Stack gap="xl" mt="md">
          <div>
            <Text size="lg" fw={600} mb="md">
              Medication Usage Summary
            </Text>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Medication</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Times Used</Table.Th>
                    <Table.Th>Total Quantity</Table.Th>
                    <Table.Th>Avg Per Use</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {medicineStats.map((stat) => {
                    const typeColor =
                      stat.medicineType === MedicineType.Acute
                        ? "#f59f00"
                        : "#37b24d";
                    return (
                      <Table.Tr key={stat.medicineId}>
                        <Table.Td>
                          <Group gap="xs">
                            <Box
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: typeColor,
                                flexShrink: 0,
                              }}
                            />
                            <Text fw={500}>{stat.medicineName}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>{stat.medicineType}</Table.Td>
                        <Table.Td>{stat.usageCount}</Table.Td>
                        <Table.Td>{stat.totalQuantity}</Table.Td>
                        <Table.Td>{stat.avgQuantityPerUse.toFixed(1)}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>
          </div>
        </Stack>
      )}

      {!loading &&
        medicineStats.length === 0 &&
        medicines.length > 0 &&
        dateRange[0] &&
        dateRange[1] && (
          <Text c="dimmed" ta="center" mt="xl">
            No medication usage found for the selected date range
          </Text>
        )}
    </Stack>
  );
};

export default Dashboard;
