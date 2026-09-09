import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GuestLocation = {
  countryId: number;
  regionId: number;
  cityId: number;
  confirmed: boolean;
};

type State = GuestLocation & {
  setLocation: (p: Partial<GuestLocation>) => void;
};

export const useLocationStore = create<State>()(
  persist(
    (set) => ({
      countryId: 1,
      regionId: 1,
      cityId: 1,
      confirmed: true,
      setLocation: (p) => set(p),
    }),
    { name: "nearhire-location" },
  ),
);
