import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import territoryService, {
  PublishTerritoryInput,
  ClaimConquestInput,
} from "../services/territoryService";

export const territoryQueryKeys = {
  all: ["territories"] as const,
};

/** Todos los territorios públicos */
export function useAllTerritories() {
  return useQuery({
    queryKey: territoryQueryKeys.all,
    queryFn: () => territoryService.getAllTerritories(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Publica un recorrido circular como territorio */
export function usePublishTerritory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<PublishTerritoryInput, "userId">) => {
      if (!user) throw new Error("Usuario no autenticado");
      return territoryService.publishTerritory({ ...input, userId: user.uid });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: territoryQueryKeys.all }),
  });
}

/** Elimina un territorio propio */
export function useDeleteTerritory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (territoryId: string) => {
      if (!user) throw new Error("Usuario no autenticado");
      return territoryService.deleteTerritory(user.uid, territoryId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: territoryQueryKeys.all }),
  });
}

/** Registra una conquista sobre un territorio ajeno */
export function useClaimConquest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ClaimConquestInput, "userId">) => {
      if (!user) throw new Error("Usuario no autenticado");
      return territoryService.claimConquest({ ...input, userId: user.uid });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: territoryQueryKeys.all }),
  });
}
