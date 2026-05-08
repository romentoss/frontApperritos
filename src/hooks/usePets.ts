/**
 * 🪝 usePets — Hooks de React Query para mascotas
 *
 * React Query se encarga de:
 * - Cache automático (no re-fetcha si los datos son frescos)
 * - Estados de loading, error y success listos para usar
 * - Invalidación de cache tras mutaciones (crear/editar/borrar)
 * - Reintento automático ante errores de red
 *
 * Exportamos:
 *   usePetsList   → lista de mascotas del usuario
 *   usePet        → una mascota específica
 *   useCreatePet  → mutación para crear
 *   useUpdatePet  → mutación para actualizar
 *   useDeletePet  → mutación para eliminar
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import petService, { PetInput } from "../services/petService";
import { useAuth } from "./useAuth";

// ─────────────────────────────────────────────
// Claves de cache (Query Keys)
// Centralizarlas evita errores de tipeo al invalidar
// ─────────────────────────────────────────────
export const petQueryKeys = {
  /** Clave para la lista de todas las mascotas del usuario */
  all: (userId: string) => ["pets", userId] as const,

  /** Clave para una mascota específica */
  detail: (userId: string, petId: string) => ["pets", userId, petId] as const,
};

// ─────────────────────────────────────────────
// 📋 Lista de mascotas
// ─────────────────────────────────────────────
export function usePetsList() {
  const { user } = useAuth();
  const userId = user?.uid ?? "";

  return useQuery({
    queryKey: petQueryKeys.all(userId),
    queryFn: () => {
      if (!userId) throw new Error("Usuario no autenticado");
      return petService.getAllPets(userId);
    },
    // No ejecutar si no hay usuario autenticado
    enabled: !!userId,
  });
}

// ─────────────────────────────────────────────
// 🐕 Mascota individual
// ─────────────────────────────────────────────
export function usePet(petId: string) {
  const { user } = useAuth();
  const userId = user?.uid ?? "";

  return useQuery({
    queryKey: petQueryKeys.detail(userId, petId),
    queryFn: () => {
      if (!userId) throw new Error("Usuario no autenticado");
      return petService.getPetById(userId, petId);
    },
    enabled: !!userId && !!petId,
  });
}

// ─────────────────────────────────────────────
// ➕ Crear mascota
// ─────────────────────────────────────────────
export function useCreatePet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? "";

  return useMutation({
    mutationFn: ({
      input,
      imageUri,
    }: {
      input: PetInput;
      imageUri?: string;
    }) => {
      if (!userId) throw new Error("Usuario no autenticado");
      return petService.createPet(userId, input, imageUri);
    },

    onSuccess: () => {
      // Invalidar la lista para que React Query la re-fetche con la nueva mascota
      queryClient.invalidateQueries({ queryKey: petQueryKeys.all(userId) });
    },
  });
}

// ─────────────────────────────────────────────
// ✏️ Actualizar mascota
// ─────────────────────────────────────────────
export function useUpdatePet(petId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? "";

  return useMutation({
    mutationFn: ({
      input,
      imageUri,
    }: {
      input: Partial<PetInput>;
      imageUri?: string;
    }) => {
      if (!userId) throw new Error("Usuario no autenticado");
      return petService.updatePet(userId, petId, input, imageUri);
    },

    onSuccess: () => {
      // Invalidar tanto el detalle como la lista
      queryClient.invalidateQueries({ queryKey: petQueryKeys.detail(userId, petId) });
      queryClient.invalidateQueries({ queryKey: petQueryKeys.all(userId) });
    },
  });
}

// ─────────────────────────────────────────────
// 🗑️ Eliminar mascota
// ─────────────────────────────────────────────
export function useDeletePet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? "";

  return useMutation({
    mutationFn: (petId: string) => {
      if (!userId) throw new Error("Usuario no autenticado");
      return petService.deletePet(userId, petId);
    },

    onSuccess: () => {
      // Invalidar la lista completa tras eliminar
      queryClient.invalidateQueries({ queryKey: petQueryKeys.all(userId) });
    },
  });
}
