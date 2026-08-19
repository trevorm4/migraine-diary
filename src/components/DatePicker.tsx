import { DateTimePicker, DatePicker as MantineDatePicker } from "@mantine/dates";

interface DatePickerProps {
  label: string;
  placeholder: string;
  value?: any; // Accept single or range values of any type
  defaultValue?: any;
  onChange: (value: any) => void;
  rangePicker?: boolean;
  excludeDate?: (date: any) => boolean;
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
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
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
      {...others}
    />
  );
}