import React, { useState, useEffect } from "react";
import {
  Stack,
  Text,
  Card,
  TextInput,
  Select,
  Textarea,
  Button,
  Loader,
  Group,
  Divider,
  Modal,
  ActionIcon,
  NumberInput,
  Badge,
  Collapse,
  Box,
} from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { Edit, Trash2, Plus, Settings, ChevronDown, ChevronUp } from "lucide-react";
import DatePicker from "@/components/DatePicker";

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

interface TrackMedicationRequest {
  name: string;
  medicine_type: MedicineType;
  description: string;
}

interface EditMedicationRequest {
  id: number;
  name: string;
  medicine_type: MedicineType;
  description: string;
}

interface AddMedicationEntryRequest {
  medicine_id: number;
  quantity: number;
  timestamp: string;
}

interface GetMedicationEntriesRequest {
  medicine_id: number;
}

const Medicines: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entries state
  const [medicineEntries, setMedicineEntries] = useState<Map<number, MedicineEntry[]>>(new Map());
  const [expandedMedicines, setExpandedMedicines] = useState<Set<number>>(new Set());
  const [loadingEntries, setLoadingEntries] = useState<Set<number>>(new Set());

  // Management modal state
  const [manageModalOpen, setManageModalOpen] = useState(false);

  const [formState, setFormState] = useState<TrackMedicationRequest>({
    name: "",
    medicine_type: MedicineType.Acute,
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [editFormState, setEditFormState] = useState<EditMedicationRequest>({
    id: 0,
    name: "",
    medicine_type: MedicineType.Acute,
    description: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add medication entry state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<number | null>(null);
  const [entryQuantity, setEntryQuantity] = useState<number>(1);
  const [entryTimestamp, setEntryTimestamp] = useState(new Date());
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const fetchMedicines = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<Medicine[]>("get_medications");
      setMedicines(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch medications"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicineEntries = async (medicineId: number) => {
    setLoadingEntries((prev) => new Set(prev).add(medicineId));
    try {
      const request: GetMedicationEntriesRequest = { medicine_id: medicineId };
      const entries = await invoke<MedicineEntry[]>("get_medication_entries", { request });
      setMedicineEntries((prev) => {
        const newMap = new Map(prev);
        newMap.set(medicineId, entries);
        return newMap;
      });
    } catch (err) {
      console.error("Failed to fetch entries:", err);
    } finally {
      setLoadingEntries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(medicineId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const toggleExpanded = async (medicineId: number) => {
    const newExpanded = new Set(expandedMedicines);
    if (newExpanded.has(medicineId)) {
      newExpanded.delete(medicineId);
    } else {
      newExpanded.add(medicineId);
      // Fetch entries if we don't have them yet
      if (!medicineEntries.has(medicineId)) {
        await fetchMedicineEntries(medicineId);
      }
    }
    setExpandedMedicines(newExpanded);
  };

  const handleInputChange = (
    field: keyof TrackMedicationRequest,
    value: string
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (!formState.name) {
      setFormError("Medication name is required.");
      setSubmitting(false);
      return;
    }

    try {
      await invoke("track_medication", { request: formState });
      setFormState({
        name: "",
        medicine_type: MedicineType.Acute,
        description: "",
      });
      setAddModalOpen(false);
      await fetchMedicines();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to add medication"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setEditFormState({
      id: medicine.id,
      name: medicine.name,
      medicine_type: medicine.medicine_type,
      description: medicine.description,
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleEditInputChange = (
    field: keyof Omit<EditMedicationRequest, "id">,
    value: string
  ) => {
    setEditFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);

    if (!editFormState.name) {
      setEditError("Medication name is required.");
      setEditSubmitting(false);
      return;
    }

    try {
      await invoke("edit_medication", { med: editFormState });
      setEditModalOpen(false);
      setEditingMedicine(null);
      await fetchMedicines();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update medication"
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteClick = (medicine: Medicine) => {
    setDeletingMedicine(medicine);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMedicine) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await invoke("delete_medication", { medId: deletingMedicine.id });
      setDeleteModalOpen(false);
      setDeletingMedicine(null);
      await fetchMedicines();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete medication"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setDeletingMedicine(null);
    setDeleteError(null);
  };

  const handleAddEntry = (medicineId: number) => {
    setSelectedMedicine(medicineId);
    setEntryQuantity(1);
    setEntryTimestamp(new Date());
    setEntryError(null);
    setEntryModalOpen(true);
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine || !entryTimestamp) return;

    setEntrySubmitting(true);
    setEntryError(null);

    try {
      const request: AddMedicationEntryRequest = {
        medicine_id: selectedMedicine,
        quantity: entryQuantity,
        timestamp: new Date(entryTimestamp).toISOString(),
      };
      await invoke("add_medication_entry", { request });
      setEntryModalOpen(false);
      setSelectedMedicine(null);
      // Refresh entries for this medication
      await fetchMedicineEntries(selectedMedicine);
    } catch (err) {
      setEntryError(
        err instanceof Error ? err.message : "Failed to add medication entry"
      );
    } finally {
      setEntrySubmitting(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Text size="xl" fw={700}>
          Track Medication
        </Text>
        <Button
          leftSection={<Settings size={18} />}
          variant="subtle"
          onClick={() => setManageModalOpen(true)}
        >
          Manage Medications
        </Button>
      </Group>

      <Stack>
        {loading && (
          <Group justify="center" mt="xl">
            <Loader size="lg" />
          </Group>
        )}
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
        {!loading && !error && medicines.length === 0 && (
          <Card withBorder radius="md" p="xl">
            <Stack align="center" gap="md">
              <Text c="dimmed" ta="center">
                You haven't added any medications yet.
              </Text>
              <Button
                onClick={() => setManageModalOpen(true)}
                leftSection={<Plus size={18} />}
              >
                Add Your First Medication
              </Button>
            </Stack>
          </Card>
        )}
        {!loading && !error && medicines.length > 0 && (
          <Stack>
            {medicines.map((med) => {
              const isExpanded = expandedMedicines.has(med.id);
              const entries = medicineEntries.get(med.id) || [];
              const isLoadingEntries = loadingEntries.has(med.id);

              return (
                <Card key={med.id} withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4}>
                        <Text fw={600} size="lg">
                          {med.name}
                        </Text>
                        <Group gap="xs">
                          <Text size="sm" c="dimmed">
                            {med.medicine_type}
                          </Text>
                          {entries.length > 0 && (
                            <Badge size="sm" variant="light">
                              {entries.length} {entries.length === 1 ? "entry" : "entries"}
                            </Badge>
                          )}
                        </Group>
                      </Stack>
                      <ActionIcon
                        variant="subtle"
                        onClick={() => toggleExpanded(med.id)}
                        aria-label="Toggle entries"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </ActionIcon>
                    </Group>
                    {med.description && (
                      <Text size="sm" c="dimmed">
                        {med.description}
                      </Text>
                    )}

                    <Collapse in={isExpanded}>
                      <Box mt="md">
                        <Divider mb="md" label="Entry History" labelPosition="center" />
                        {isLoadingEntries ? (
                          <Group justify="center" p="md">
                            <Loader size="sm" />
                          </Group>
                        ) : entries.length === 0 ? (
                          <Text size="sm" c="dimmed" ta="center" py="md">
                            No entries yet
                          </Text>
                        ) : (
                          <Stack gap="xs">
                            {entries.map((entry) => (
                              <Card key={entry.id} withBorder p="sm" bg="gray.0">
                                <Group justify="space-between">
                                  <Text size="sm">{formatDateTime(entry.timestamp)}</Text>
                                  <Badge size="sm" variant="filled">
                                    Qty: {entry.quantity}
                                  </Badge>
                                </Group>
                              </Card>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    </Collapse>

                    <Button
                      fullWidth
                      leftSection={<Plus size={18} />}
                      onClick={() => handleAddEntry(med.id)}
                    >
                      Log Entry
                    </Button>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>

      {/* Management Modal */}
      <Modal
        opened={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title="Manage Medications"
        size="lg"
      >
        <Stack>
          <Button
            leftSection={<Plus size={18} />}
            onClick={() => {
              setManageModalOpen(false);
              setAddModalOpen(true);
            }}
          >
            Add New Medication
          </Button>
          <Divider />
          {medicines.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No medications yet. Add one to get started.
            </Text>
          ) : (
            <Stack>
              {medicines.map((med) => (
                <Card key={med.id} withBorder radius="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text fw={600}>{med.name}</Text>
                      <Text size="sm" c="dimmed">
                        {med.medicine_type}
                      </Text>
                      {med.description && (
                        <Text size="sm" mt="xs">
                          {med.description}
                        </Text>
                      )}
                    </Stack>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleEditClick(med)}
                        aria-label="Edit medication"
                      >
                        <Edit size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteClick(med)}
                        aria-label="Delete medication"
                      >
                        <Trash2 size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>

      {/* Add Medication Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Medication"
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Medication Name"
              placeholder="e.g., Sumatriptan"
              value={formState.name}
              onChange={(e) => handleInputChange("name", e.currentTarget.value)}
              required
            />
            <Select
              label="Medication Type"
              value={formState.medicine_type}
              onChange={(value) =>
                handleInputChange("medicine_type", value as MedicineType)
              }
              data={[
                { value: MedicineType.Acute, label: "Acute" },
                { value: MedicineType.Preventative, label: "Preventative" },
              ]}
              required
            />
            <Textarea
              label="Description / Notes"
              placeholder="e.g., Take at the onset of a migraine"
              value={formState.description}
              onChange={(e) =>
                handleInputChange("description", e.currentTarget.value)
              }
            />
            {formError && (
              <Text c="red" size="sm">
                {formError}
              </Text>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => setAddModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Add Medication
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Medication"
        size="lg"
      >
        <form onSubmit={handleEditSubmit}>
          <Stack>
            <TextInput
              label="Medication Name"
              placeholder="e.g., Sumatriptan"
              value={editFormState.name}
              onChange={(e) =>
                handleEditInputChange("name", e.currentTarget.value)
              }
              required
            />
            <Select
              label="Medication Type"
              value={editFormState.medicine_type}
              onChange={(value) =>
                handleEditInputChange("medicine_type", value as MedicineType)
              }
              data={[
                { value: MedicineType.Acute, label: "Acute" },
                { value: MedicineType.Preventative, label: "Preventative" },
              ]}
              required
            />
            <Textarea
              label="Description / Notes"
              placeholder="e.g., Take at the onset of a migraine"
              value={editFormState.description}
              onChange={(e) =>
                handleEditInputChange("description", e.currentTarget.value)
              }
            />
            {editError && (
              <Text c="red" size="sm">
                {editError}
              </Text>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => setEditModalOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={editSubmitting}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Delete Medication"
        size="md"
      >
        <Stack>
          <Text>
            Are you sure you want to delete{" "}
            <strong>{deletingMedicine?.name}</strong>? This action cannot be
            undone.
          </Text>
          {deleteError && (
            <Text c="red" size="sm">
              {deleteError}
            </Text>
          )}
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={handleDeleteCancel}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteConfirm}
              loading={deleting}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Medication Entry Modal */}
      <Modal
        opened={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        title="Log Medication Entry"
        size="md"
      >
        <form onSubmit={handleEntrySubmit}>
          <Stack>
            <Text size="sm" c="dimmed">
              Recording entry for:{" "}
              <strong>
                {medicines.find((m) => m.id === selectedMedicine)?.name}
              </strong>
            </Text>
            <NumberInput
              label="Quantity"
              placeholder="1"
              value={entryQuantity}
              onChange={(value) => setEntryQuantity(Number(value))}
              min={1}
              required
            />
            <DatePicker
              label="Date and Time"
              placeholder="Pick date and time"
              value={entryTimestamp}
              onChange={(value) => setEntryTimestamp(value)}
            />
            {entryError && (
              <Text c="red" size="sm">
                {entryError}
              </Text>
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => setEntryModalOpen(false)}
                disabled={entrySubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={entrySubmitting}>
                Log Entry
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

export default Medicines;
