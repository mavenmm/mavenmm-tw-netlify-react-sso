import "@teamwork/login-button";
import { getEnvVar, isDev } from "../utils/env";

export function Login() {
  const TEAMWORK_REDIRECT_URI = getEnvVar("VITE_TEAMWORK_REDIRECT_URI");
  const TEAMWORK_CLIENT_ID = getEnvVar("VITE_TEAMWORK_CLIENT_ID");
  const TEAMWORK_CLIENT_SECRET = getEnvVar("VITE_TEAMWORK_CLIENT_SECRET");

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* @ts-ignore - Teamwork login button is a web component */}
      <teamwork-login-button
        redirectURI={TEAMWORK_REDIRECT_URI}
        clientID={TEAMWORK_CLIENT_ID}
        icon="false"
        color="slate"
        size="medium"
        borders="default"
      />

      {/* Debug info for development */}
      {isDev() && (
        <div className="text-left text-sm mt-10">
          <pre>
            <table className="table-auto">
              <tbody>
                <tr>
                  <td className="pr-2">Redirect URI</td>
                  <td>{TEAMWORK_REDIRECT_URI}</td>
                </tr>
                <tr>
                  <td className="pr-2">Client ID</td>
                  <td>{TEAMWORK_CLIENT_ID}</td>
                </tr>
                <tr>
                  <td className="pr-2">Client Secret</td>
                  <td>{TEAMWORK_CLIENT_SECRET ? "***hidden***" : "Not set"}</td>
                </tr>
              </tbody>
            </table>
          </pre>
        </div>
      )}
    </div>
  );
}
