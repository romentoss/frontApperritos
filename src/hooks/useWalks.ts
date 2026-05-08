import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import walkService, { WalkInput } from "../services/walkService";
import { useAuth } from "./useAuth";
import { usePetsList } from "./usePets";

export const walkQueryKeys = {
  allForUser: (userId: string) => ["walks", "user", userId] as const,
  byPet: (userId: string, petId: string) => ["walks", "pet", userId, petId] as const,
  detail: (walkId: string) => ["walks", "detail", walkId] as const,
};

/** Todos los recorridos del usuario (todas las mascotas) */
export function useAllWalks() {
  const { user } = useAuth();
  const { data: pets } = usePetsList();
  const petIds = useMemo(() => pets?.map((p) => p.id) ?? [], [pets]);
  const userId = user?.uid ?? "";

  return useQuery({
    queryKey: [...walkQueryKeys.allForUser(userId), petIds],
    queryFn: () => {
      if (!userId) throw new Error("Usuario no autenticado");
      return walkService.getAllForPets(userId, petIds);
    },
    enabled: !!user && !!pets,
  });
}

/** Recorridos de una mascota específica */
export function useWalksByPet(petId: string) {
  const { user } = useAuth();
  const userId = user?.uid ?? "";
  return useQuery({
    queryKey: walkQueryKeys.byPet(userId, petId),
    queryFn: () => {
      if (!userId) throw new Error("Usuario no autenticado");
      return walkService.getAllForPet(userId, petId);
    },
    enabled: !!user && !!petId,
  });
}

/** Detalle de un recorrido (incluye coordenadas completas) */
export function useWalk(walkId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.uid ?? "";
  return useQuery({
    queryKey: walkQueryKeys.detail(walkId ?? ""),
    queryFn: () => {
      if (!userId) throw new Error("Usuario no autenticado");
      return walkService.getById(userId, walkId!);
    },
    enabled: !!user && !!walkId,
  });
}

export function useSaveWalk() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? "";
  return useMutation({
    mutationFn: (input: WalkInput) => {
      if (!userId) throw new Error("Usuario no autenticado");
      return walkService.create(userId, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["walks"] }),
  });
}

export function useDeleteWalk() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? "";
  return useMutation({
    mutationFn: (walkId: string) => {
      if (!userId) throw new Error("Usuario no autenticado");
      return walkService.delete(userId, walkId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["walks"] }),
  });
}
