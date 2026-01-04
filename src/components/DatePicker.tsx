import { DateTimePicker, DatePicker as MantineDatePicker } from "@mantine/dates";

interface DatePickerProps {
  label: string;
  placeholder: string;
  value: [string | null, string | null] | string | null; // Allow both types
  defaultValue: [string | null, string | null] | string | null; // Allow both types
  onChange: (value: any) => void;
  rangePicker?: boolean; // Changed from 'boolean | null' to optional boolean
  excludeDate?: (date: Date) => boolean;
}

export default function DatePicker({
  rangePicker,
  value,
  defaultValue,
  onChange,
  ...others
}: DatePickerProps) {
  if (rangePicker) {
    return (
      <MantineDatePicker
        type="range"
        value={value as [Date | null, Date | null]}
        defaultValue={defaultValue}
        onChange={onChange}
        weekendDays={[]}
        {...others}
      />
    );
  }

  return (
    <DateTimePicker
      value={value instanceof Array ? value[0] : value}
      defaultValue={defaultValue}
      onChange={onChange}
      valueFormat="MM/DD/YYYY hh:mm A"
      weekendDays={[]}
      {...others}
    />
  );
}

