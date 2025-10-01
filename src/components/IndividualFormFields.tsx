import React from "react";
import {
  Grid,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

export type PersonFormValues = {
  givenName: string;
  familyName?: string;
  birthFamilyName?: string;
  gender?: string; // "male" | "female" | "other" | ""
  dateOfBirth?: string; // ISO yyyy-mm-dd
  birthRegion?: string;
  birthCity?: string;
  birthCongregation?: string;
  dateOfDeath?: string; // ISO yyyy-mm-dd
  deathRegion?: string;
  deathCity?: string;
  deathCongregation?: string;
};

type Flags = {
  names?: boolean;
  gender?: boolean;
  birth?: boolean;
  death?: boolean;
};

type RequiredFlags = Partial<Record<keyof PersonFormValues, boolean>>;
type ErrorMap = Partial<Record<keyof PersonFormValues, string>>;

type Props = {
  value: PersonFormValues;
  onChange: (patch: Partial<PersonFormValues>) => void;
  fields?: Flags;
  required?: RequiredFlags;
  errors?: ErrorMap;
  disabled?: boolean;
  autoFocusFirst?: boolean;
};

export default function IndividualFormFields({
  value,
  onChange,
  fields = { names: true, gender: true, birth: true, death: false },
  required,
  errors,
  disabled,
  autoFocusFirst,
}: Props) {
  const show = { names: !!fields.names, gender: !!fields.gender, birth: !!fields.birth, death: !!fields.death };

  return (
    <Grid container spacing={2}>
      {show.names && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle2">Namn</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Förnamn"
              value={value.givenName ?? ""}
              required={!!required?.givenName}
              error={!!errors?.givenName}
              helperText={errors?.givenName}
              onChange={(e) => onChange({ givenName: e.target.value })}
              fullWidth
              disabled={disabled}
              autoFocus={autoFocusFirst}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Efternamn"
              value={value.familyName ?? ""}
              required={!!required?.familyName}
              error={!!errors?.familyName}
              helperText={errors?.familyName}
              onChange={(e) => onChange({ familyName: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Efternamn (vid födsel)"
              value={value.birthFamilyName ?? ""}
              required={!!required?.birthFamilyName}
              error={!!errors?.birthFamilyName}
              helperText={errors?.birthFamilyName}
              onChange={(e) => onChange({ birthFamilyName: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>
        </>
      )}

      {show.gender && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle2">Kön</Typography>
          </Grid>
          <Grid item xs={12}>
            <ToggleButtonGroup
              value={value.gender ?? ""}
              exclusive
              onChange={(_, g) => onChange({ gender: g ?? "" })}
              size="small"
              aria-label="Kön"
              disabled={disabled}
            >
              <ToggleButton value="female" aria-label="Kvinna">Kvinna</ToggleButton>
              <ToggleButton value="male" aria-label="Man">Man</ToggleButton>
              <ToggleButton value="other" aria-label="Annat">Annat</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </>
      )}

      {show.birth && (
        <>
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="subtitle2">Födelse</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="date"
              label="Födelsedatum"
              value={value.dateOfBirth ?? ""}
              required={!!required?.dateOfBirth}
              error={!!errors?.dateOfBirth}
              helperText={errors?.dateOfBirth}
              onChange={(e) => onChange({ dateOfBirth: e.target.value || undefined })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Stad/Ort"
              value={value.birthCity ?? ""}
              required={!!required?.birthCity}
              error={!!errors?.birthCity}
              helperText={errors?.birthCity}
              onChange={(e) => onChange({ birthCity: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Församling"
              value={value.birthCongregation ?? ""}
              required={!!required?.birthCongregation}
              error={!!errors?.birthCongregation}
              helperText={errors?.birthCongregation}
              onChange={(e) => onChange({ birthCongregation: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Län/Region"
              value={value.birthRegion ?? ""}
              required={!!required?.birthRegion}
              error={!!errors?.birthRegion}
              helperText={errors?.birthRegion}
              onChange={(e) => onChange({ birthRegion: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>
        </>
      )}

      {show.death && (
        <>
          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="subtitle2">Död</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="date"
              label="Dödsdatum"
              value={value.dateOfDeath ?? ""}
              required={!!required?.dateOfDeath}
              error={!!errors?.dateOfDeath}
              helperText={errors?.dateOfDeath}
              onChange={(e) => onChange({ dateOfDeath: e.target.value || undefined })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Stad/Ort (död)"
              value={value.deathCity ?? ""}
              required={!!required?.deathCity}
              error={!!errors?.deathCity}
              helperText={errors?.deathCity}
              onChange={(e) => onChange({ deathCity: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Församling (död)"
              value={value.deathCongregation ?? ""}
              required={!!required?.deathCongregation}
              error={!!errors?.deathCongregation}
              helperText={errors?.deathCongregation}
              onChange={(e) => onChange({ deathCongregation: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Län/Region (död)"
              value={value.deathRegion ?? ""}
              required={!!required?.deathRegion}
              error={!!errors?.deathRegion}
              helperText={errors?.deathRegion}
              onChange={(e) => onChange({ deathRegion: e.target.value })}
              fullWidth
              disabled={disabled}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
}