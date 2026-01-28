import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Specification, SpecValue } from '../types';

interface SpecificationsState {
  specifications: Specification[];
  addSpecification: (name: string) => string;
  updateSpecification: (id: string, updates: Partial<Pick<Specification, 'name'>>) => void;
  removeSpecification: (id: string) => void;
  reorderSpec: (specId: string, newOrder: number) => void;
  addSpecValue: (specId: string, displayValue: string, skuFragment: string) => string;
  updateSpecValue: (specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'displayValue' | 'skuFragment'>>) => void;
  removeSpecValue: (specId: string, valueId: string) => void;
  getSpecificationById: (id: string) => Specification | undefined;
}

const generateId = () => crypto.randomUUID();

export const useSpecificationsStore = create<SpecificationsState>()(
  persist(
    (set, get) => ({
      specifications: [],

      addSpecification: (name: string) => {
        const id = generateId();
        const { specifications } = get();
        // New specs get order = max existing order + 1 (or 0 if none exist)
        const maxOrder = specifications.reduce((max, spec) => Math.max(max, spec.order), -1);
        const order = maxOrder + 1;

        set({
          specifications: [
            ...specifications,
            { id, name, order, values: [] },
          ],
        });

        return id;
      },

      updateSpecification: (id: string, updates: Partial<Pick<Specification, 'name'>>) => {
        set((state) => ({
          specifications: state.specifications.map((spec) =>
            spec.id === id ? { ...spec, ...updates } : spec
          ),
        }));
      },

      removeSpecification: (id: string) => {
        set((state) => {
          const filtered = state.specifications.filter((spec) => spec.id !== id);
          // Recalculate order values to be contiguous
          const sorted = [...filtered].sort((a, b) => a.order - b.order);
          return {
            specifications: sorted.map((spec, index) => ({
              ...spec,
              order: index,
            })),
          };
        });
      },

      reorderSpec: (specId: string, newOrder: number) => {
        set((state) => {
          const specs = [...state.specifications];
          const specIndex = specs.findIndex((s) => s.id === specId);
          if (specIndex === -1) return state;

          const spec = specs[specIndex];
          const oldOrder = spec.order;

          if (oldOrder === newOrder) return state;

          // Update orders: shift other specs to make room
          const updatedSpecs = specs.map((s) => {
            if (s.id === specId) {
              return { ...s, order: newOrder };
            }
            // If moving down (oldOrder < newOrder), shift specs in between up
            if (oldOrder < newOrder && s.order > oldOrder && s.order <= newOrder) {
              return { ...s, order: s.order - 1 };
            }
            // If moving up (oldOrder > newOrder), shift specs in between down
            if (oldOrder > newOrder && s.order >= newOrder && s.order < oldOrder) {
              return { ...s, order: s.order + 1 };
            }
            return s;
          });

          return { specifications: updatedSpecs };
        });
      },

      addSpecValue: (specId: string, displayValue: string, skuFragment: string) => {
        const valueId = generateId();

        set((state) => ({
          specifications: state.specifications.map((spec) =>
            spec.id === specId
              ? { ...spec, values: [...spec.values, { id: valueId, displayValue, skuFragment }] }
              : spec
          ),
        }));

        return valueId;
      },

      updateSpecValue: (specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'displayValue' | 'skuFragment'>>) => {
        set((state) => ({
          specifications: state.specifications.map((spec) =>
            spec.id === specId
              ? {
                  ...spec,
                  values: spec.values.map((val) =>
                    val.id === valueId ? { ...val, ...updates } : val
                  ),
                }
              : spec
          ),
        }));
      },

      removeSpecValue: (specId: string, valueId: string) => {
        set((state) => ({
          specifications: state.specifications.map((spec) =>
            spec.id === specId
              ? { ...spec, values: spec.values.filter((val) => val.id !== valueId) }
              : spec
          ),
        }));
      },

      getSpecificationById: (id: string) => {
        return get().specifications.find((spec) => spec.id === id);
      },
    }),
    {
      name: 'sku-specifications',
    }
  )
);
