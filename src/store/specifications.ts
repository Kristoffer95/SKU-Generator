import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Specification, SpecValue } from '../types';

interface SpecificationsState {
  specifications: Specification[];
  addSpecification: (name: string) => string;
  updateSpecification: (id: string, updates: Partial<Pick<Specification, 'name' | 'columnIndex'>>) => void;
  removeSpecification: (id: string) => void;
  reorderSpecifications: (fromIndex: number, toIndex: number) => void;
  addSpecValue: (specId: string, label: string, skuCode: string) => string;
  updateSpecValue: (specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'label' | 'skuCode'>>) => void;
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
        const columnIndex = specifications.length;

        set({
          specifications: [
            ...specifications,
            { id, name, values: [], columnIndex },
          ],
        });

        return id;
      },

      updateSpecification: (id: string, updates: Partial<Pick<Specification, 'name' | 'columnIndex'>>) => {
        set((state) => ({
          specifications: state.specifications.map((spec) =>
            spec.id === id ? { ...spec, ...updates } : spec
          ),
        }));
      },

      removeSpecification: (id: string) => {
        set((state) => {
          const filtered = state.specifications.filter((spec) => spec.id !== id);
          // Recalculate column indices
          return {
            specifications: filtered.map((spec, index) => ({
              ...spec,
              columnIndex: index,
            })),
          };
        });
      },

      reorderSpecifications: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const specs = [...state.specifications];
          const [moved] = specs.splice(fromIndex, 1);
          specs.splice(toIndex, 0, moved);
          // Recalculate column indices
          return {
            specifications: specs.map((spec, index) => ({
              ...spec,
              columnIndex: index,
            })),
          };
        });
      },

      addSpecValue: (specId: string, label: string, skuCode: string) => {
        const valueId = generateId();

        set((state) => ({
          specifications: state.specifications.map((spec) =>
            spec.id === specId
              ? { ...spec, values: [...spec.values, { id: valueId, label, skuCode }] }
              : spec
          ),
        }));

        return valueId;
      },

      updateSpecValue: (specId: string, valueId: string, updates: Partial<Pick<SpecValue, 'label' | 'skuCode'>>) => {
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
