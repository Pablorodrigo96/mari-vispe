import { Navigate, useParams } from "react-router-dom";

/**
 * Navigate component that interpolates :param tokens from the current route.
 * Example: <RedirectWithParams to="/equity-brain/crm/mandate/:id" />
 */
export function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  const resolved = to.replace(/:([a-zA-Z_]+)/g, (_, k) => params[k] ?? "");
  return <Navigate to={resolved} replace />;
}
