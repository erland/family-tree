import React from "react";
import { Autocomplete, TextField } from "@mui/material";
import { Individual } from "@core";
import { fullName } from "@core";

type Props = {
  individuals: Individual[];
  parentIds: string[];
  childId: string;
  onChange: {
    setParentIds: (ids: string[]) => void;
    setChildId: (id: string) => void;
  };
};

export default function RelationshipEditorParentChildForm({
  individuals,
  parentIds,
  childId,
  onChange,
}: Props) {
  return (
    <>
      <Autocomplete
        multiple
        options={individuals}
        getOptionLabel={(o) => fullName(o)}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            {fullName(option)}
          </li>
        )}
        value={individuals.filter((i) => parentIds.includes(i.id))}
        onChange={(_, vals) => onChange.setParentIds(vals.map((v) => v.id))}
        renderInput={(p) => <TextField {...p} label="Förälder/Föräldrar" sx={{ mt: 1 }} />}
        sx={{ mb: 2 }}
      />
      <Autocomplete
        options={individuals}
        getOptionLabel={(o) => fullName(o)}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            {fullName(option)}
          </li>
        )}
        value={individuals.find((i) => i.id === childId) ?? null}
        onChange={(_, v) => onChange.setChildId(v?.id ?? "")}
        renderInput={(p) => <TextField {...p} label="Barn" sx={{ mt: 1 }} />}
        sx={{ mb: 2 }}
      />
    </>
  );
}