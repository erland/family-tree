import React from "react";
import { Autocomplete, Grid, TextField } from "@mui/material";
import { Individual } from "../types/individual";
import { fullName } from "../utils/nameUtils";

type Props = {
  individuals: Individual[];
  groom: string;
  bride: string;
  weddingDate: string;
  weddingRegion: string;
  weddingCity: string;
  weddingCongregation: string;
  onChange: {
    setGroom: (id: string) => void;
    setBride: (id: string) => void;
    setWeddingDate: (v: string) => void;
    setWeddingRegion: (v: string) => void;
    setWeddingCity: (v: string) => void;
    setWeddingCongregation: (v: string) => void;
  };
};

export default function RelationshipEditorSpouseForm({
  individuals,
  groom,
  bride,
  weddingDate,
  weddingRegion,
  weddingCity,
  weddingCongregation,
  onChange,
}: Props) {
  return (
    <>
      <Autocomplete
        options={individuals}
        getOptionLabel={(o) => fullName(o)}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            {fullName(option)}
          </li>
        )}
        value={individuals.find((i) => i.id === groom) ?? null}
        onChange={(_, v) => onChange.setGroom(v?.id ?? "")}
        renderInput={(p) => <TextField {...p} label="Man" sx={{ mt: 1 }} />}
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
        value={individuals.find((i) => i.id === bride) ?? null}
        onChange={(_, v) => onChange.setBride(v?.id ?? "")}
        renderInput={(p) => <TextField {...p} label="Kvinna" sx={{ mt: 1 }} />}
        sx={{ mb: 2 }}
      />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Vigsel (ÅÅÅÅ[-MM[-DD]])"
            value={weddingDate}
            onChange={(e) => onChange.setWeddingDate(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Vigsel län/region"
            value={weddingRegion}
            onChange={(e) => onChange.setWeddingRegion(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Vigsel ort"
            value={weddingCity}
            onChange={(e) => onChange.setWeddingCity(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Vigsel församling"
            value={weddingCongregation}
            onChange={(e) => onChange.setWeddingCongregation(e.target.value)}
            fullWidth
          />
        </Grid>
      </Grid>
    </>
  );
}