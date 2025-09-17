import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

type Individual = {
  id: string;
  name: string;
  birthDate?: string;
  birthLocation?: { region: string; congregation: string; city: string };
  deathDate?: string;
  deathLocation?: { region: string; congregation: string; city: string };
  story?: string;
};

type Data = {
  individuals: Individual[];
  relationships: any[];
};

const adapter = new JSONFile<Data>("genealogy.json");
const db = new Low<Data>(adapter, { individuals: [], relationships: [] });

export default db;
