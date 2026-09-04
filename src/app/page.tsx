import { MapComponent } from "@/components/map";
import { getBackendAuth } from "@/lib/auth/get-backend-auth";

export default async function Index() {
  const auth = await getBackendAuth();
  return <MapComponent authenticated={Boolean(auth?.backendAccess)} />;
}
