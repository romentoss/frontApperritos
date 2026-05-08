import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import appointmentService, { AppointmentInput } from "../services/appointmentService";
import { useAuth } from "./useAuth";
import { usePetsList } from "./usePets";

export const appointmentQueryKeys = {
  allForUser: (userId: string) => ["appointments", "user", userId] as const,
  byPet: (userId: string, petId: string) => ["appointments", "pet", userId, petId] as const,
};

/** Todas las citas del usuario (todas las mascotas), ordenadas por fecha ASC */
export function useAllAppointments() {
  const { user } = useAuth();
  const { data: pets } = usePetsList();
  const petIds = useMemo(() => pets?.map((p) => p.id) ?? [], [pets]);

  return useQuery({
    queryKey: [...appointmentQueryKeys.allForUser(user?.uid ?? ""), petIds],
    queryFn: () => appointmentService.getAllForPets(user!.uid, petIds),
    enabled: !!user && !!pets,
  });
}

/** Citas de una mascota específica */
export function useAppointmentsByPet(petId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: appointmentQueryKeys.byPet(user?.uid ?? "", petId),
    queryFn: () => appointmentService.getAllForPet(user!.uid, petId),
    enabled: !!user && !!petId,
  });
}

export function useCreateAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AppointmentInput) => appointmentService.create(user!.uid, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      petId, appointmentId, input,
    }: { petId: string; appointmentId: string; input: Partial<AppointmentInput> }) =>
      appointmentService.update(user!.uid, petId, appointmentId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useMarkAppointmentComplete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, appointmentId }: { petId: string; appointmentId: string }) =>
      appointmentService.markComplete(user!.uid, petId, appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useDeleteAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, appointmentId }: { petId: string; appointmentId: string }) =>
      appointmentService.delete(user!.uid, petId, appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}
