import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import vaccineService, { VaccineInput } from "../services/vaccineService";
import { useAuth } from "./useAuth";
import { usePetsList } from "./usePets";

export const vaccineQueryKeys = {
  allForUser: (userId: string) => ["vaccines", "user", userId] as const,
  byPet: (userId: string, petId: string) => ["vaccines", "pet", userId, petId] as const,
};

/** Lista de vacunas de TODAS las mascotas del usuario */
export function useAllVaccines() {
  const { user } = useAuth();
  const { data: pets } = usePetsList();
  const petIds = useMemo(() => pets?.map((p) => p.id) ?? [], [pets]);

  return useQuery({
    queryKey: [...vaccineQueryKeys.allForUser(user?.uid ?? ""), petIds],
    queryFn: () => vaccineService.getAllForPets(user!.uid, petIds),
    enabled: !!user && !!pets,
  });
}

/** Lista de vacunas de una mascota específica */
export function useVaccinesByPet(petId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: vaccineQueryKeys.byPet(user?.uid ?? "", petId),
    queryFn: () => vaccineService.getAllForPet(user!.uid, petId),
    enabled: !!user && !!petId,
  });
}

export function useCreateVaccine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VaccineInput) => vaccineService.create(user!.uid, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vaccines"] }),
  });
}

export function useUpdateVaccine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      petId, vaccineId, input,
    }: { petId: string; vaccineId: string; input: Partial<VaccineInput> }) =>
      vaccineService.update(user!.uid, petId, vaccineId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vaccines"] }),
  });
}

export function useDeleteVaccine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, vaccineId }: { petId: string; vaccineId: string }) =>
      vaccineService.delete(user!.uid, petId, vaccineId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vaccines"] }),
  });
}
