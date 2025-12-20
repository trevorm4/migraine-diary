import React, { useState, useEffect } from "react";
import {
  Stack,
  Text,
  Card,
  Group,
  Box,
  Flex,
  Loader,
  Pagination,
  Center,
  Modal,
  Button,
  Textarea,
  Select,
  NumberInput,
  ActionIcon,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { Pencil, Trash2 } from "lucide-react";
import DatePicker from "@/components/DatePicker";
import { invoke } from "@tauri-apps/api/core";
import { HeadacheLocation } from "@/lib/types";
import { chunk } from "@/lib/utils";
import { HEADACHE_COLORS } from "@/lib/constants";

interface Entry {
  id: number;
  start_dt: string;
  end_dt: string;
  description: string;
  severity: number;
  headache_location: HeadacheLocation;
}

interface EditEntryRequest {
  id: number;
  description: string;
  start_date: string;
  end_date: string;
  severity: number;
  headache_location: HeadacheLocation;
}


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calculateDuration = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMs = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

interface DeleteModalProps {
  opened: boolean;
  onClose: () => void;
  entry: Entry | null;
  onDelete: (id: number) => Promise<void>;
}

function DeleteModal({ opened, onClose, entry, onDelete }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!entry) return;

    setDeleting(true);
    try {
      await onDelete(entry.id);
      onClose();
    } catch (error) {
      console.error("Error deleting entry:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Delete Entry" size="sm">
      <Stack gap="md">
        <Text>
          Are you sure you want to delete this entry? This action cannot be undone.
        </Text>

        {entry && (
          <Card withBorder padding="sm" bg="gray.0">
            <Stack gap="xs">
              <Group gap="xs">
                <Box
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: HEADACHE_COLORS[entry.headache_location],
                    flexShrink: 0,
                  }}
                />
                <Text size="sm" fw={600}>{entry.headache_location}</Text>
              </Group>
              <Text size="xs" c="dimmed">
                {formatDate(entry.start_dt)} - {formatDate(entry.end_dt)}
              </Text>
            </Stack>
          </Card>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface EditModalProps {
  opened: boolean;
  onClose: () => void;
  entry: Entry | null;
  onSave: (request: EditEntryRequest) => Promise<void>;
}

function EditModal({ opened, onClose, entry, onSave }: EditModalProps) {
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [severity, setSeverity] = useState<number>(5);
  const [headacheLocation, setHeadacheLocation] = useState<HeadacheLocation>("Front");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setDescription(entry.description);
      setStartDate(new Date(entry.start_dt));
      setEndDate(new Date(entry.end_dt));
      setSeverity(entry.severity);
      setHeadacheLocation(entry.headache_location);
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry || !startDate || !endDate) return;

    setSaving(true);
    try {
      await onSave({
        id: entry.id,
        description,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        severity,
        headache_location: headacheLocation,
      });
      onClose();
    } catch (error) {
      console.error("Error saving entry:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Entry" size="md">
      <Stack gap="md">
        <Select
          label="Headache Location"
          value={headacheLocation}
          onChange={(value) => setHeadacheLocation(value as HeadacheLocation)}
          data={[
            { value: "Front", label: "Front" },
            { value: "Back", label: "Back" },
            { value: "Left", label: "Left" },
            { value: "Right", label: "Right" },
            { value: "Top", label: "Top" },
            { value: "Whole", label: "Whole" },
          ]}
        />

        <NumberInput
          label="Severity"
          value={severity}
          onChange={(value) => setSeverity(Number(value))}
          min={1}
          max={10}
        />

        <DateTimePicker
          label="Start Date & Time"
          value={startDate}
          onChange={setStartDate}
        />

        <DateTimePicker
          label="End Date & Time"
          value={endDate}
          onChange={setEndDate}
        />

        <Textarea
          label="Notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function EntriesTable({
  entries,
  activePage,
  setActivePage,
  onEditEntry,
  onDeleteEntry,
}: {
  entries: Entry[];
  activePage: number;
  setActivePage: (page: number) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
}) {
  const chunkedEntries = chunk(entries, 5);
  const currentEntries = chunkedEntries[activePage - 1] || [];

  return (
    <Stack mt="md" gap="md">
      {currentEntries.map((entry) => {
        const color = HEADACHE_COLORS[entry.headache_location];
        return (
          <Card key={entry.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Flex justify="space-between" align="center">
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
                  <Text fw={600}>{entry.headache_location}</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    Severity: {entry.severity}/10
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => onEditEntry(entry)}
                  >
                    <Pencil size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => onDeleteEntry(entry)}
                  >
                    <Trash2 size={18} />
                  </ActionIcon>
                </Group>
              </Flex>

              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Start:
                </Text>
                <Text size="sm">{formatDate(entry.start_dt)}</Text>
              </Group>

              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  End:
                </Text>
                <Text size="sm">{formatDate(entry.end_dt)}</Text>
              </Group>

              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Duration:
                </Text>
                <Text size="sm">
                  {calculateDuration(entry.start_dt, entry.end_dt)}
                </Text>
              </Group>

              {entry.description && (
                <>
                  <Text size="sm" c="dimmed" mt="xs">
                    Notes:
                  </Text>
                  <Text size="sm">{entry.description}</Text>
                </>
              )}
            </Stack>
          </Card>
        );
      })}
      {chunkedEntries.length > 0 && (
        <Pagination
          total={chunkedEntries.length}
          value={activePage}
          onChange={setActivePage}
          mt="sm"
        />
      )}
    </Stack>
  );
}

const History: React.FC = () => {
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
  const [activePage, setActivePage] = useState(1);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const fetchEntries = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      setEntries([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setActivePage(1);

    try {
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

  useEffect(() => {
    fetchEntries();
  }, [dateRange]);

  const handleEditEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setEditModalOpened(true);
  };

  const handleDeleteEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setDeleteModalOpened(true);
  };

  const handleSaveEntry = async (request: EditEntryRequest) => {
    try {
      await invoke("edit_entry", { request });
      await fetchEntries();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to save entry");
    }
  };

  const handleConfirmDelete = async (id: number) => {
    try {
      await invoke("delete_entry", { request: { id } });
      await fetchEntries();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete entry");
    }
  };

  return (
    <Stack>
      <Text size="xl" fw={700}>
        Migraine History
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
        <EntriesTable
          entries={entries}
          activePage={activePage}
          setActivePage={setActivePage}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      )}

      <EditModal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        entry={selectedEntry}
        onSave={handleSaveEntry}
      />

      <DeleteModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        entry={selectedEntry}
        onDelete={handleConfirmDelete}
      />
    </Stack>
  );
};

export default History;
