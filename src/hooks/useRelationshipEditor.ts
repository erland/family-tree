import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "../store";
import { addRelationship, updateRelationship } from "../features/relationshipsSlice";
import { Relationship } from "@core";
import { wouldCreateCycle } from "@core";

export type RelType = "spouse" | "parent-child";

export function useRelationshipEditor(initial?: Relationship) {
  const dispatch = useAppDispatch();
  const relationships = useAppSelector((s) => s.relationships.items);

  const isEdit = !!initial;
  const [type, setType] = useState<RelType>(initial?.type ?? "spouse");

  // spouse fields
  const [groom, setGroom] = useState(initial?.type === "spouse" ? initial.person1Id : "");
  const [bride, setBride] = useState(initial?.type === "spouse" ? initial.person2Id : "");
  const [weddingDate, setWeddingDate] = useState(
    initial?.type === "spouse" ? (initial.weddingDate ?? "") : ""
  );
  const [weddingRegion, setWeddingRegion] = useState(
    initial?.type === "spouse" ? (initial.weddingRegion ?? "") : ""
  );
  const [weddingCity, setWeddingCity] = useState(
    initial?.type === "spouse" ? (initial.weddingCity ?? "") : ""
  );
  const [weddingCongregation, setWeddingCongregation] = useState(
    initial?.type === "spouse" ? (initial.weddingCongregation ?? "") : ""
  );

  // parent-child fields
  const [parentIds, setParentIds] = useState<string[]>(
    initial?.type === "parent-child" ? initial.parentIds : []
  );
  const [childId, setChildId] = useState<string>(
    initial?.type === "parent-child" ? initial.childId : ""
  );

  const [error, setError] = useState<string | null>(null);

  const reset = useCallback((rel?: Relationship | null) => {
    setError(null);
    if (rel) {
      if (rel.type === "spouse") {
        setType("spouse");
        setGroom(rel.person1Id);
        setBride(rel.person2Id);
        setWeddingDate(rel.weddingDate ?? "");
        setWeddingRegion(rel.weddingRegion ?? "");
        setWeddingCity(rel.weddingCity ?? "");
        setWeddingCongregation(rel.weddingCongregation ?? "");
        setParentIds([]);
        setChildId("");
      } else {
        setType("parent-child");
        setParentIds(rel.parentIds ?? []);
        setChildId(rel.childId ?? "");
        setGroom("");
        setBride("");
        setWeddingDate("");
        setWeddingRegion("");
        setWeddingCity("");
        setWeddingCongregation("");
      }
    } else {
      setType("spouse");
      setGroom("");
      setBride("");
      setWeddingDate("");
      setWeddingRegion("");
      setWeddingCity("");
      setWeddingCongregation("");
      setParentIds([]);
      setChildId("");
    }
  }, []);

  const save = useCallback((): boolean => {
    setError(null);

    if (type === "spouse") {
      const payload: Relationship = {
        id: isEdit && initial ? initial.id : uuidv4(),
        type: "spouse",
        person1Id: groom,
        person2Id: bride,
        weddingDate: weddingDate || undefined,
        weddingRegion: weddingRegion || undefined,
        weddingCongregation: weddingCongregation || undefined,
        weddingCity: weddingCity || undefined,
      };
      isEdit ? dispatch(updateRelationship(payload)) : dispatch(addRelationship(payload));
      return true;
    }

    // parent-child validations (match current behavior)
    if (!childId) {
      setError("Välj ett barn.");
      return false;
    }
    if (parentIds.length === 0) {
      setError("Välj minst en förälder.");
      return false;
    }
    if (parentIds.includes(childId)) {
      setError("Ett barn kan inte också vara förälder.");
      return false;
    }
    if (parentIds.some((pid) => wouldCreateCycle(relationships, pid, childId))) {
      setError("Det här skulle skapa en cykel i släktträdet.");
      return false;
    }

    const payload: Relationship = {
      id: isEdit && initial ? initial.id : uuidv4(),
      type: "parent-child",
      parentIds,
      childId,
    };
    isEdit ? dispatch(updateRelationship(payload)) : dispatch(addRelationship(payload));
    return true;
  }, [
    type,
    isEdit,
    initial,
    groom,
    bride,
    weddingDate,
    weddingRegion,
    weddingCity,
    weddingCongregation,
    parentIds,
    childId,
    relationships,
    dispatch,
  ]);

  return {
    // meta
    isEdit,
    type,
    setType,
    error,
    setError,
    reset,

    // spouse
    groom,
    setGroom,
    bride,
    setBride,
    weddingDate,
    setWeddingDate,
    weddingRegion,
    setWeddingRegion,
    weddingCity,
    setWeddingCity,
    weddingCongregation,
    setWeddingCongregation,

    // parent-child
    parentIds,
    setParentIds,
    childId,
    setChildId,

    // actions
    save,
  };
}