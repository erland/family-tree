import { v4 as uuidv4 } from "uuid";
import {
  Box, Typography, IconButton, TextField, Grid, Button, Divider, Tooltip,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { Move } from "@core/domain";

type Props = {
  value?: Move[];
  onChange: (moves: Move[]) => void;
};

export default function MoveListEditor({ value = [], onChange }: Props) {
  const setAt = (idx: number, patch: Partial<Move>) => {
    const next = value.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const add = () => onChange([...(value || []), { id: uuidv4() } as Move]);
  const remove = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const datePattern = /^\d{4}(-\d{2}){0,2}$/;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="subtitle1">Flyttar</Typography>
        <Tooltip title="Lägg till flytt">
          <IconButton size="small" onClick={add}><Add fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
      {value.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Inga flyttar tillagda.</Typography>
      ) : null}

      {value.map((mv, idx) => (
        <Box key={mv.id} sx={{ p: 1, borderRadius: 1, border: "1px solid #eee", mb: 1 }}>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Datum (YYYY[-MM[-DD]])"
                size="small"
                fullWidth
                value={mv.date || ""}
                onChange={(e) => setAt(idx, { date: e.target.value })}
                placeholder="Ex: 1883, 1883-05 eller 1883-05-23"
                error={!!mv.date && !datePattern.test(mv.date)}
                helperText={
                  !!mv.date && !datePattern.test(mv.date)
                    ? "Ogiltigt format - använd ÅÅÅÅ, ÅÅÅÅ-MM eller ÅÅÅÅ-MM-DD"
                    : undefined
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Region"
                size="small"
                fullWidth
                value={mv.region || ""}
                onChange={(e) => setAt(idx, { region: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Stad"
                size="small"
                fullWidth
                value={mv.city || ""}
                onChange={(e) => setAt(idx, { city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Församling"
                size="small"
                fullWidth
                value={mv.congregation || ""}
                onChange={(e) => setAt(idx, { congregation: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <Button
                color="error"
                startIcon={<Delete />}
                onClick={() => remove(idx)}
              >
                Ta bort
              </Button>
            </Grid>
            <Grid item xs={12}><Divider /></Grid>
            <Grid item xs={12}>
              <TextField
                label="Anteckning"
                size="small"
                fullWidth
                value={mv.note || ""}
                onChange={(e) => setAt(idx, { note: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      ))}
    </Box>
  );
}