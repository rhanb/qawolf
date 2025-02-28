import { useContext } from "react";

import { UserContext } from "../components/UserContext";
import { copy } from "../theme/copy";

export const useApiKey = (): string => {
  const { team } = useContext(UserContext);

  return team?.api_key || copy.apiKeyHere;
};
