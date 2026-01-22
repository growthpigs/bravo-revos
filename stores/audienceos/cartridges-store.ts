// stores/cartridges-store.ts
import { create } from 'zustand'
import { Cartridge, CartridgeType } from '@/types/audienceos/database'

interface CartridgesStore {
  // State
  cartridges: Cartridge[]
  loading: boolean
  error: string | null
  selectedCartridgeId: string | null
  filterType: CartridgeType | 'all'

  // Actions
  fetchCartridges: (agencyId: string, filters?: { type?: CartridgeType }) => Promise<void>
  createCartridge: (data: Partial<Cartridge>) => Promise<Cartridge>
  updateCartridge: (id: string, data: Partial<Cartridge>) => Promise<void>
  deleteCartridge: (id: string) => Promise<void>
  setDefaultCartridge: (id: string, type: CartridgeType) => Promise<void>
  selectCartridge: (id: string | null) => void
  setFilterType: (type: CartridgeType | 'all') => void
  getSelectedCartridge: () => Cartridge | null
}

export const useCartridgesStore = create<CartridgesStore>((set, get) => ({
  cartridges: [],
  loading: false,
  error: null,
  selectedCartridgeId: null,
  filterType: 'all',

  fetchCartridges: async (agencyId: string, filters = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams({
        agency_id: agencyId,
        ...(filters.type && { type: filters.type }),
      })

      const response = await fetch(`/api/v1/cartridges?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch cartridges')
      }

      const data = await response.json()
      set({ cartridges: data.data || [] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
    } finally {
      set({ loading: false })
    }
  },

  createCartridge: async (data: Partial<Cartridge>) => {
    try {
      const response = await fetch('/api/v1/cartridges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create cartridge')
      }

      const result = await response.json()

      // Validate result structure before using it
      if (!result.data) {
        throw new Error('Server did not return cartridge data')
      }

      if (!result.data.id) {
        throw new Error('Server returned cartridge without id')
      }

      const newCartridge = result.data

      set((state) => ({
        cartridges: [newCartridge, ...state.cartridges],
      }))

      return newCartridge
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  updateCartridge: async (id: string, data: Partial<Cartridge>) => {
    try {
      const response = await fetch(`/api/v1/cartridges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update cartridge')
      }

      set((state) => ({
        cartridges: state.cartridges.map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  deleteCartridge: async (id: string) => {
    try {
      const response = await fetch(`/api/v1/cartridges/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to delete cartridge')
      }

      set((state) => ({
        cartridges: state.cartridges.filter((c) => c.id !== id),
        selectedCartridgeId:
          state.selectedCartridgeId === id ? null : state.selectedCartridgeId,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  setDefaultCartridge: async (id: string, type: CartridgeType) => {
    try {
      const response = await fetch(`/api/v1/cartridges/${id}/set-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        throw new Error('Failed to set default cartridge')
      }

      set((state) => ({
        cartridges: state.cartridges.map((c) => ({
          ...c,
          is_default: c.id === id && c.type === type ? true : false,
        })),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  selectCartridge: (id: string | null) => {
    set({ selectedCartridgeId: id })
  },

  setFilterType: (type: CartridgeType | 'all') => {
    set({ filterType: type })
  },

  getSelectedCartridge: () => {
    const { cartridges, selectedCartridgeId } = get()
    if (!selectedCartridgeId) return null
    return cartridges.find((c) => c.id === selectedCartridgeId) || null
  },
}))
