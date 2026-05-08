import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import foodService, { FoodRecordInput, PeriodicPurchaseInput } from "../services/foodService";
import { useAuth } from "./useAuth";
import { usePetsList } from "./usePets";

export const foodQueryKeys = {
  recordsForUser: (userId: string) => ["food", "records", "user", userId] as const,
  periodicForUser: (userId: string) => ["food", "periodic", "user", userId] as const,
  recordsByPet: (userId: string, petId: string) => ["food", "records", "pet", userId, petId] as const,
  periodicByPet: (userId: string, petId: string) => ["food", "periodic", "pet", userId, petId] as const,
};

/** Historial de compras de todas las mascotas */
export function useAllFoodRecords() {
  const { user } = useAuth();
  const { data: pets } = usePetsList();
  const petIds = useMemo(() => pets?.map((p) => p.id) ?? [], [pets]);

  return useQuery({
    queryKey: [...foodQueryKeys.recordsForUser(user?.uid ?? ""), petIds],
    queryFn: () => foodService.getRecordsForPets(user!.uid, petIds),
    enabled: !!user && !!pets,
  });
}

/** Compras periódicas configuradas de todas las mascotas */
export function useAllPeriodicPurchases() {
  const { user } = useAuth();
  const { data: pets } = usePetsList();
  const petIds = useMemo(() => pets?.map((p) => p.id) ?? [], [pets]);

  return useQuery({
    queryKey: [...foodQueryKeys.periodicForUser(user?.uid ?? ""), petIds],
    queryFn: () => foodService.getPeriodicForPets(user!.uid, petIds),
    enabled: !!user && !!pets,
  });
}

/** Registros de comida de una mascota específica */
export function useFoodRecordsByPet(petId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: foodQueryKeys.recordsByPet(user?.uid ?? "", petId),
    queryFn: () => foodService.getRecordsForPet(user!.uid, petId),
    enabled: !!user && !!petId,
  });
}

export function useCreateFoodRecord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FoodRecordInput) => foodService.createRecord(user!.uid, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food"] }),
  });
}

export function useUpdateFoodRecord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, recordId, input }: { petId: string; recordId: string; input: Partial<FoodRecordInput> }) =>
      foodService.updateRecord(user!.uid, petId, recordId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food"] }),
  });
}

export function useDeleteFoodRecord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, recordId }: { petId: string; recordId: string }) =>
      foodService.deleteRecord(user!.uid, petId, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food"] }),
  });
}

export function useCreatePeriodic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PeriodicPurchaseInput) => foodService.createPeriodic(user!.uid, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food"] }),
  });
}

export function useUpdatePeriodic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      petId, periodicId, input,
    }: { petId: string; periodicId: string; input: Partial<PeriodicPurchaseInput> }) =>
      foodService.updatePeriodic(user!.uid, petId, periodicId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food"] }),
  });
}

export function useDeletePeriodic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, periodicId }: { petId: string; periodicId: string }) =>
      foodService.deletePeriodic(user!.uid, petId, periodicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["food"] }),
  });
}
