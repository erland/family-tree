// src/core/viewModelBuilders/timeline/types.ts
import { LifeEvent } from "../personHistory/types";

export type TimelineBuckets = {
  beforeBirth: LifeEvent[];
  lifeEvents: LifeEvent[];
  afterDeath: LifeEvent[];
  undated: LifeEvent[];
};