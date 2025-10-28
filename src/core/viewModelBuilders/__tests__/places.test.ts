import {
  mapIndividualsToEvents,
  buildPlacesBaseIndex,
  buildPlacesList,
  countTotalEvents,
  expandPlacesById,
  PlacesSortMode,
  PlaceVM,
} from "../places";

import {
  fullName,
  buildPlacesIndex,
  expandRelatedPlaces,
} from "@core/domain";

import type { Individual, Relationship } from "@core/domain";

// --- Mock the domain helpers so these tests are focused on the viewModelBuilder layer ---

jest.mock("@core/domain", () => {
  return {
    fullName: jest.fn(),
    buildPlacesIndex: jest.fn(),
    expandRelatedPlaces: jest.fn(),
  };
});

const mockFullName = fullName as jest.Mock;
const mockBuildPlacesIndex = buildPlacesIndex as jest.Mock;
const mockExpandRelatedPlaces = expandRelatedPlaces as jest.Mock;

// Small helpers to fabricate domain-like inputs

function makeInd(id: string, givenName = "Testy"): Individual {
  // Only include what our code actually touches (id, givenName)
  return { id, givenName } as any;
}

function makeSpouseRel(id: string, p1: string, p2: string): Relationship {
  return { id, type: "spouse", person1Id: p1, person2Id: p2 } as any;
}

function makeParentChildRel(
  id: string,
  parents: string[],
  child: string
): Relationship {
  return {
    id,
    type: "parent-child",
    parentIds: parents,
    childId: child,
  } as any;
}

// -----------------------------------------------------------------------------
// mapIndividualsToEvents
// -----------------------------------------------------------------------------

describe("mapIndividualsToEvents", () => {
  beforeEach(() => {
    mockFullName.mockReset();
  });

  test("maps placeLike.individuals into sorted PlaceEventVM rows", () => {
    mockFullName.mockImplementation((ind: any) => `FN:${ind.id}`);

    const placeLike = {
      individuals: [
        {
          id: "evt2",
          date: "1900-05-10",
          event: "Död",
          ind: { id: "p2" },
        },
        {
          id: "evt1",
          date: "1880-01-01",
          event: "Födelse",
          ind: { id: "p1" },
        },
        {
          id: "evt3",
          date: null,
          event: "Flytt",
          ind: { id: "p3" },
        },
      ],
    };

    const rows = mapIndividualsToEvents(placeLike);

    // Sorted ascending by (date ?? ""), so null/undefined dates ("") come FIRST.
    expect(rows.map((r) => r.id)).toEqual(["evt3", "evt1", "evt2"]);

    // Check shape of first mapped row (which is evt3: null date)
    expect(rows[0]).toEqual({
      id: "evt3",
      date: null,
      label: "Flytt",
      individualId: "p3",
      individualName: "FN:p3",
      raw: {
        id: "evt3",
        date: null,
        event: "Flytt",
        ind: { id: "p3" },
      },
    });
  });

  test("falls back safely if individuals[] is missing", () => {
    const rows = mapIndividualsToEvents({});
    expect(rows).toEqual([]);
  });

  test("uses default label 'Händelse' if no event string", () => {
    mockFullName.mockReturnValue("FN:p9");

    const rows = mapIndividualsToEvents({
      individuals: [
        {
          id: "evt9",
          date: "2000-01-01",
          // no .event field
          ind: { id: "p9" },
        },
      ],
    });

    expect(rows[0].label).toBe("Händelse");
  });
});

// -----------------------------------------------------------------------------
// buildPlacesBaseIndex
// -----------------------------------------------------------------------------

describe("buildPlacesBaseIndex", () => {
  beforeEach(() => {
    mockBuildPlacesIndex.mockReset();
  });

  test("delegates to buildPlacesIndex and returns its result", () => {
    const fakeIndividuals = [makeInd("a"), makeInd("b")];
    const fakeRelationships = [
      makeSpouseRel("r1", "a", "b"),
      makeParentChildRel("r2", ["a", "b"], "c"),
    ];

    const fakeIndex = [
      { name: "Luleå", individuals: [] },
      { name: "Umeå", individuals: [] },
    ];

    mockBuildPlacesIndex.mockReturnValue(fakeIndex);

    const result = buildPlacesBaseIndex(fakeIndividuals, fakeRelationships);

    expect(mockBuildPlacesIndex).toHaveBeenCalledWith(
      fakeIndividuals,
      fakeRelationships
    );
    expect(result).toBe(fakeIndex);
  });
});

// -----------------------------------------------------------------------------
// buildPlacesList
// -----------------------------------------------------------------------------

describe("buildPlacesList", () => {
  beforeEach(() => {
    mockFullName.mockReset();
  });

  test("builds PlaceVMs with subtitle based on number of people", () => {
    mockFullName.mockImplementation((ind: any) => `NAME:${ind.id}`);

    const baseIndex = [
      {
        name: "Stockholm",
        individuals: [
          {
            id: "evt1",
            date: "1920-01-01",
            event: "Födelse",
            ind: { id: "p1" },
          },
          {
            id: "evt2",
            date: "1950-12-12",
            event: "Död",
            ind: { id: "p2" },
          },
        ],
      },
      {
        name: "Göteborg",
        individuals: [
          {
            id: "evt3",
            date: "1930-06-10",
            event: "Födelse",
            ind: { id: "p3" },
          },
        ],
      },
    ];

    const list = buildPlacesList(baseIndex, null, "alpha");

    // Check first item
    expect(list[0]).toMatchObject({
      id: "Göteborg",
      title: "Göteborg",
      subtitle: "1 person",
      events: expect.any(Array),
    });

    // Check second item
    expect(list[1]).toMatchObject({
      id: "Stockholm",
      title: "Stockholm",
      subtitle: "2 personer",
      events: expect.any(Array),
    });
  });

  test("filters by place name OR individualName using query", () => {
    mockFullName.mockImplementation((ind: any) => `N:${ind.id}`);

    const baseIndex = [
      {
        name: "Luleå",
        individuals: [
          {
            id: "evt1",
            date: "1900-01-01",
            event: "Födelse",
            ind: { id: "p1" },
          },
        ],
      },
      {
        name: "Kiruna",
        individuals: [
          {
            id: "evt2",
            date: "1910-01-01",
            event: "Flytt",
            ind: { id: "bob" }, // fullName => N:bob
          },
        ],
      },
    ];

    // Search by place name
    const listByPlace = buildPlacesList(baseIndex, "lule", "alpha");
    expect(listByPlace.map((p) => p.title)).toEqual(["Luleå"]);

    // Search by person name
    const listByPerson = buildPlacesList(baseIndex, "bob", "alpha");
    expect(listByPerson.map((p) => p.title)).toEqual(["Kiruna"]);
  });

  test("sorts according to sort mode (alpha, events-desc, events-asc)", () => {
    mockFullName.mockImplementation((ind: any) => `N:${ind.id}`);

    const baseIndex = [
      {
        name: "B-town",
        individuals: [
          {
            id: "evt1",
            date: "1900",
            event: "Födelse",
            ind: { id: "p1" },
          },
        ],
      },
      {
        name: "A-town",
        individuals: [
          {
            id: "evt2",
            date: "1901",
            event: "Död",
            ind: { id: "p2" },
          },
          {
            id: "evt3",
            date: "1902",
            event: "Flytt",
            ind: { id: "p2" },
          },
        ],
      },
    ];

    const alpha = buildPlacesList(baseIndex, null, "alpha");
    expect(alpha.map((p) => p.title)).toEqual(["A-town", "B-town"]);

    const desc = buildPlacesList(baseIndex, null, "events-desc");
    // A-town has 2 events, B-town has 1 → A-town first
    expect(desc.map((p) => p.title)).toEqual(["A-town", "B-town"]);

    const asc = buildPlacesList(baseIndex, null, "events-asc");
    // B-town (1 event) should come before A-town (2 events)
    expect(asc.map((p) => p.title)).toEqual(["B-town", "A-town"]);
  });
});

// -----------------------------------------------------------------------------
// countTotalEvents
// -----------------------------------------------------------------------------

describe("countTotalEvents", () => {
  test("sums p.individuals.length across baseIndex", () => {
    const baseIndex = [
      { name: "X", individuals: [{}, {}, {}] },
      { name: "Y", individuals: [{}] },
      { name: "Z", individuals: [] },
    ];

    const total = countTotalEvents(baseIndex);
    expect(total).toBe(4);
  });

  test("treats missing individuals as length 0", () => {
    const baseIndex = [{ name: "NoArray" }]; // no individuals[]
    expect(countTotalEvents(baseIndex)).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// expandPlacesById
// -----------------------------------------------------------------------------

describe("expandPlacesById", () => {
  beforeEach(() => {
    mockFullName.mockReset();
    mockExpandRelatedPlaces.mockReset();
  });

  test("returns null if baseName is falsy", () => {
    const vm = expandPlacesById([], "");
    expect(vm).toBeNull();
  });

  test("merges events from expandRelatedPlaces() and builds subtitle", () => {
    mockFullName.mockImplementation((ind: any) => `NAME:${ind.id}`);

    const baseIndex = [
      { name: "Stockholm" },
      { name: "Stockholms län" },
    ];

    // expandRelatedPlaces(baseIndex, "Stockholm") should return an array
    // of "placeLike" items, each with .individuals[]
    mockExpandRelatedPlaces.mockReturnValue([
      {
        name: "Stockholm",
        individuals: [
          {
            id: "e1",
            date: "1900-01-01",
            event: "Födelse",
            ind: { id: "p1" },
          },
        ],
      },
      {
        name: "Stockholms län",
        individuals: [
          {
            id: "e2",
            date: "1920-01-01",
            event: "Död",
            ind: { id: "p2" },
          },
        ],
      },
    ]);

    const vm = expandPlacesById(baseIndex, "Stockholm");

    // Make sure the underlying function was called correctly
    expect(mockExpandRelatedPlaces).toHaveBeenCalledWith(
      baseIndex,
      "Stockholm"
    );

    // It should merge all events from both "Stockholm" and "Stockholms län"
    expect(vm?.events.map((e) => e.id)).toEqual(["e1", "e2"]);

    // Subtitle should reflect the total number of merged events
    expect(vm?.subtitle).toBe("2 händelser");

    // id/title should equal the requested baseName
    expect(vm?.id).toBe("Stockholm");
    expect(vm?.title).toBe("Stockholm");
  });
});