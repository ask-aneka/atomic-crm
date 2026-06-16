import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDataProvider } from "ra-core";

import type { CrmDataProvider } from "../providers/types";
import {
  useConfigurationUpdater,
  type ConfigurationContextValue,
  type PublicBranding,
} from "./ConfigurationContext";

/**
 * Loads public branding (title + logos) from the anon-readable
 * `configuration_branding` view and partially merges it into the configuration
 * store. Runs for unauthenticated routes (login, sign-up, forgot-password) so
 * they match the branding set in Settings, before the full configuration is
 * fetched on login.
 *
 * Only branding fields are merged; env-seeded fields (googleWorkplaceDomain,
 * disableEmailPasswordAuthentication) are preserved.
 */
export const usePublicBrandingLoader = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const updateConfiguration = useConfigurationUpdater();

  const { data } = useQuery<PublicBranding>({
    queryKey: ["publicBranding"],
    queryFn: () => dataProvider.getPublicBranding(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      updateConfiguration((prev: ConfigurationContextValue) => ({
        ...prev,
        ...data,
      }));
    }
  }, [data, updateConfiguration]);
};
