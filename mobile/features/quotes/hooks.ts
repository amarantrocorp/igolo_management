import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fetchQuotes, fetchQuote, type FetchQuotesParams } from "./api";
import { getToken } from "../../lib/storage";
import { API_URL } from "../../lib/constants";
import { useToast } from "../../components/molecules/Toast";
import { useOrgId } from "../../lib/use-org-id";

/**
 * Fetch paginated quotes with optional filters.
 */
export function useQuotes(filters: FetchQuotesParams = {}) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["quotes", orgId, filters],
    queryFn: () => fetchQuotes(filters),
    placeholderData: (prev) => prev,
  });
}

/**
 * Fetch a single quotation with rooms and items.
 */
export function useQuote(id: string) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ["quote", orgId, id],
    queryFn: () => fetchQuote(id),
    enabled: !!id,
  });
}

/**
 * Download a quotation PDF and open the native share sheet.
 * Uses expo-file-system (new API) to download and expo-sharing to share.
 */
export function useShareQuotePDF() {
  const toast = useToast();

  const share = useCallback(async (id: string) => {
    try {
      const token = await getToken();
      const filename = `quotation-${id.slice(0, 8)}.pdf`;

      const destination = new File(Paths.cache, filename);
      const downloadedFile = await File.downloadFileAsync(
        `${API_URL}/quotes/${id}/pdf`,
        destination,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        toast.show("Sharing is not supported on this device.", "warning");
        return;
      }

      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Quotation PDF",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to share PDF";
      toast.show(message, "error");
    }
  }, [toast]);

  return { share };
}
