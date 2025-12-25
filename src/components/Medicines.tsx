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
} from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { Edit, Trash2, Plus } from "lucide-react";

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

const Medicines: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchMedicines();
  }, []);

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

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Text size="xl" fw={700}>
          Manage Medications
        </Text>
        <Button
          leftSection={<Plus size={18} />}
          onClick={() => setAddModalOpen(true)}
        >
          Add Medication
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
          <Text c="dimmed">You haven't tracked any medications yet.</Text>
        )}
        {!loading && !error && medicines.length > 0 && (
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
    </Stack>
  );
};

export default Medicines;
