// src/features/ages/AgeBucketPeopleList.tsx

import React from "react";
import {
  Box,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { Individual } from "@core/domain";
import { fullName } from "@core/domain";
import { calculateAgeAtEvent } from "@core/domain";

export interface AgeBucketPeopleListProps {
  showUnknown: boolean;
  selectedRange: [number, number] | null;
  peopleInRange: Individual[];
  selectedPerson: Individual | null;
  onSelectPerson: (ind: Individual) => void;
}

export function AgeBucketPeopleList({
  showUnknown,
  selectedRange,
  peopleInRange,
  selectedPerson,
  onSelectPerson,
}: AgeBucketPeopleListProps) {
  return (
    <>
      {/* Info header */}
      <Box sx={{ mb: 1 }}>
        {showUnknown ? (
          <Typography variant="subtitle1" gutterBottom>
            Personer med okänd ålder ({peopleInRange.length})
          </Typography>
        ) : selectedRange ? (
          <Typography variant="subtitle1" gutterBottom>
            Personer mellan {selectedRange[0]}–{selectedRange[1]} år (
            {peopleInRange.length})
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Klicka på en stapel för att visa personer i det åldersintervallet.
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Scrollable list */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List dense>
          {peopleInRange.map((ind) => {
            const age =
              ind.dateOfBirth && ind.dateOfDeath
                ? calculateAgeAtEvent(ind.dateOfBirth, ind.dateOfDeath)
                : undefined;

            const secondary =
              ind.dateOfBirth && ind.dateOfDeath
                ? `${ind.dateOfBirth} – ${ind.dateOfDeath}`
                : ind.dateOfBirth
                ? `${ind.dateOfBirth} – Okänt`
                : ind.dateOfDeath
                ? `Okänt – ${ind.dateOfDeath}`
                : "";

            return (
              <ListItemButton
                key={ind.id}
                onClick={() => onSelectPerson(ind)}
                selected={selectedPerson?.id === ind.id}
              >
                <ListItemText
                  primary={
                    <>
                      {fullName(ind)}
                      {age && (
                        <>
                          {" "}
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            ({age})
                          </Typography>
                        </>
                      )}
                    </>
                  }
                  secondary={secondary}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </>
  );
}