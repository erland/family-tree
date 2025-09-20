import React from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual"
import { fullName } from "../utils/nameUtils";

interface Props {
  label: string;
  value: string | string[] | null;
  onChange: (id: string | string[] | null) => void;
  multiple?: boolean;
}

export default function IndividualPicker({ label, value, onChange, multiple }: Props) {
  const individuals = useAppSelector((s) => s.individuals.items);

  if (multiple) {
    // MULTI-SELECT MODE
    const selected = Array.isArray(value)
      ? individuals.filter((i) => value.includes(i.id))
      : [];

    return (
      <Autocomplete
        multiple
        options={individuals}
        getOptionLabel={(option: Individual) => fullName(option)}
        value={selected}
        onChange={(_e, newVals) => onChange(newVals.map((v) => v.id))}
        renderInput={(params) => <TextField {...params} label={label} />}
      />
    );
  }

  // SINGLE-SELECT MODE
  const selected = individuals.find((i) => i.id === value) || null;

  return (
    <Autocomplete
      options={individuals}
      getOptionLabel={(option: Individual) => fullName(option)}
      value={selected}
      onChange={(_e, newVal) => onChange(newVal ? newVal.id : null)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}