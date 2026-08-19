import React, { useState } from "react";
import {
  Select,
  TextInput,
  Button,
  Stack,
  Box,
  Text,
  Slider,
  Group,
  Flex,
  Modal,
  NumberInput,
} from "@mantine/core";
import DatePicker from "@/components/DatePicker";
import { useNavigate } from "react-router-dom";
import { getEnumKeys } from "@/lib/utils";
import { HEADACHE_COLORS } from "@/lib/constants";
import { HeadacheLocation } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";

interface EntryData {
  start_date: Date;
  duration_hours: number;
  description: string;
  severity: number;
  headache_location: HeadacheLocation;
}

function excludeDate(date: Date): boolean {
  const selectedDate = new Date(date);
  const today = new Date();

  // Set both to midnight in local timezone for date-only comparison
  selectedDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return selectedDate >= today;
}

const SubmitEntry: React.FC = () => {
  const navigate = useNavigate();
  const [modalOpened, setModalOpened] = useState(false);
  const [formData, setFormData] = useState<EntryData>({
    severity: 5,
    headache_location: HeadacheLocation.Temple,
    start_date: new Date(),
    duration_hours: 4,
    description: "",
  });

  const resetForm = () => {
    setFormData({
      severity: 5,
      headache_location: HeadacheLocation.Temple,
      start_date: new Date(),
      duration_hours: 4,
      description: "",
    });
  };

  const handleSubmit = async () => {
    const startDate = new Date(formData.start_date);
    const endDate = new Date(
      startDate.getTime() + formData.duration_hours * 60 * 60 * 1000
    );

    const requestData = {
      ...formData,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    };

    await invoke("submit_entry", { request: requestData });
    setModalOpened(true);
  };

  const handleSubmitAnother = () => {
    setModalOpened(false);
    resetForm();
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <Stack>
      <Text size="xl" fw={700}>
        New Migraine Entry
      </Text>

      <DatePicker
        label="Start Date"
        placeholder="Pick date and time"
        value={formData.start_date}
        onChange={(value) => setFormData({ ...formData, start_date: value })}
        excludeDate={excludeDate}
      />
      <NumberInput
        label="Duration (hours)"
        description="How long did the migraine last?"
        value={formData.duration_hours}
        onChange={(value) =>
          setFormData({ ...formData, duration_hours: Number(value) })
        }
        min={0.5}
        step={0.5}
        allowDecimal
        allowNegative={false}
      />

      <TextInput
        label="Description"
        onChange={(value) =>
          setFormData({ ...formData, description: value.currentTarget.value })
        }
      />
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Severity
        </Text>
        <Slider
          value={formData.severity}
          onChange={(value) => setFormData({ ...formData, severity: value })}
          min={1}
          max={10}
          step={1}
          mb="sm"
          marks={[
            { value: 1, label: "1" },
            { value: 5, label: "5" },
            { value: 10, label: "10" },
          ]}
        />
      </Stack>

      <Select
        label="Headache Type"
        placeholder="Select a type..."
        value={formData.headache_location}
        onChange={(value) =>
          setFormData({ ...formData, headache_location: value as HeadacheLocation })
        }
        data={getEnumKeys(HeadacheLocation).map((key) => {
          const headacheValue = HeadacheLocation[key];

          return {
            value: headacheValue,
            label: key,
          };
        })}
        renderOption={({ option }) => {
          const color = HEADACHE_COLORS[option.value as HeadacheLocation];
          return (
            <Flex align="center" gap="sm">
              <Box
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <Text>{option.label}</Text>
            </Flex>
          );
        }}
      />

      <Button onClick={handleSubmit} size="md">
        Submit
      </Button>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Entry Submitted"
        centered
      >
        <Stack>
          <Text>Your migraine entry has been successfully recorded.</Text>
          <Group grow>
            <Button onClick={handleSubmitAnother} variant="default">
              Submit Another
            </Button>
            <Button onClick={handleGoHome}>Go Home</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default SubmitEntry;
