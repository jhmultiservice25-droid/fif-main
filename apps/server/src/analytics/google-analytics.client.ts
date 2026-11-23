import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const JWT_TTL_S = 3600;

export interface IReportRequest {
  dateRanges: { startDate: string; endDate: string }[];
  metrics: { name: string }[];
  dimensions?: { name: string }[];
  orderBys?: unknown[];
  limit?: number;
  dimensionFilter?: unknown;
}

export interface IReportRow {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

export interface IReportResponse {
  rows?: IReportRow[];
  totals?: IReportRow[];
}

/**
 * Two ways to authorise the read, because organisations that enforce
 * `iam.disableServiceAccountKeyCreation` cannot hand out a service-account key.
 */
type ICredentials =
  | { kind: "oauth"; clientId: string; clientSecret: string; refreshToken: string }
  | { kind: "service-account"; clientEmail: string; privateKey: string };

const base64url = (value: Buffer | string) =>
  Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const env = (name: string) => process.env[name]?.trim();

/**
 * Minimal GA4 Data API client: calls runReport over REST with an OAuth refresh token or a
 * service-account JWT. Deliberately dependency-free — the official SDK pulls in gRPC and a
 * large dependency tree.
 */
export class GoogleAnalyticsClient {
  private readonly logger = new Logger(GoogleAnalyticsClient.name);
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly propertyId: string,
    private readonly credentials: ICredentials,
  ) {}

  /**
   * Which pieces of configuration are present, so the console can say exactly what is missing.
   * Lists the OAuth route by default and the service-account one when that is what ops started with.
   */
  static status() {
    const site = [
      {
        key: "GA_MEASUREMENT_ID",
        label: "Identifiant de mesure du site",
        hint: "Commence par G- (étape 1.4 du guide)",
        present: !!env("GA_MEASUREMENT_ID"),
      },
      {
        key: "GA4_PROPERTY_ID",
        label: "Identifiant de la propriété",
        hint: "Le nombre à 9 ou 10 chiffres (étape 1.5)",
        present: !!env("GA4_PROPERTY_ID"),
      },
    ];
    if (env("GA_SERVICE_ACCOUNT_EMAIL") || env("GA_SERVICE_ACCOUNT_KEY")) {
      return [
        ...site,
        {
          key: "GA_SERVICE_ACCOUNT_EMAIL",
          label: "Adresse du compte de service",
          hint: "…@…iam.gserviceaccount.com",
          present: !!env("GA_SERVICE_ACCOUNT_EMAIL"),
        },
        {
          key: "GA_SERVICE_ACCOUNT_KEY",
          label: "Clé privée du compte de service",
          hint: "Champ private_key du fichier .json",
          present: !!env("GA_SERVICE_ACCOUNT_KEY"),
        },
      ];
    }
    return [
      ...site,
      {
        key: "GA_OAUTH_CLIENT_ID",
        label: "Identifiant du client OAuth",
        hint: "Se termine par .apps.googleusercontent.com (étape 2.3)",
        present: !!env("GA_OAUTH_CLIENT_ID"),
      },
      {
        key: "GA_OAUTH_CLIENT_SECRET",
        label: "Code secret du client OAuth",
        hint: "Commence par GOCSPX- (étape 2.3)",
        present: !!env("GA_OAUTH_CLIENT_SECRET"),
      },
      {
        key: "GA_OAUTH_REFRESH_TOKEN",
        label: "Jeton d'autorisation",
        hint: "Commence par 1// — obtenu une seule fois (étape 2.5)",
        present: !!env("GA_OAUTH_REFRESH_TOKEN"),
      },
    ];
  }

  /** Configured only when the property and one complete set of credentials are present. */
  static fromEnv(): GoogleAnalyticsClient | null {
    const propertyId = env("GA4_PROPERTY_ID");
    const credentials = this.credentialsFromEnv();
    if (!propertyId || !credentials) return null;
    return new GoogleAnalyticsClient(propertyId, credentials);
  }

  private static credentialsFromEnv(): ICredentials | null {
    const clientId = env("GA_OAUTH_CLIENT_ID");
    const clientSecret = env("GA_OAUTH_CLIENT_SECRET");
    const refreshToken = env("GA_OAUTH_REFRESH_TOKEN");
    if (clientId && clientSecret && refreshToken) return { kind: "oauth", clientId, clientSecret, refreshToken };

    const clientEmail = env("GA_SERVICE_ACCOUNT_EMAIL");
    // Env files keep the PEM on one line with escaped newlines.
    const privateKey = process.env.GA_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n").trim();
    if (clientEmail && privateKey) return { kind: "service-account", clientEmail, privateKey };
    return null;
  }

  async runReport(request: IReportRequest): Promise<IReportResponse> {
    const token = await this.accessToken();
    const response = await fetch(`${DATA_API}/properties/${this.propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`GA4 runReport ${response.status}: ${detail.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        response.status === 403
          ? "Le compte autorisé n'a pas accès à cette propriété Google Analytics."
          : "Google Analytics est momentanément indisponible.",
      );
    }
    return (await response.json()) as IReportResponse;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;

    const body =
      this.credentials.kind === "oauth"
        ? new URLSearchParams({
            grant_type: "refresh_token",
            client_id: this.credentials.clientId,
            client_secret: this.credentials.clientSecret,
            refresh_token: this.credentials.refreshToken,
          })
        : new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: this.assertion(this.credentials.clientEmail, this.credentials.privateKey),
          });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Jeton Google refusé (${response.status}): ${detail.slice(0, 200)}`);
      // invalid_grant on the OAuth route means the authorisation was revoked or has expired.
      throw new ServiceUnavailableException(
        this.credentials.kind === "oauth" && detail.includes("invalid_grant")
          ? "L'autorisation Google a expiré. Il faut refaire l'étape d'autorisation pour obtenir un nouveau jeton."
          : "Authentification Google Analytics impossible.",
      );
    }
    const payload = (await response.json()) as { access_token: string; expires_in: number };
    this.token = { value: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 };
    return this.token.value;
  }

  private assertion(clientEmail: string, privateKey: string): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(
      JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: issuedAt, exp: issuedAt + JWT_TTL_S }),
    );
    try {
      const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(privateKey);
      return `${header}.${claims}.${base64url(signature)}`;
    } catch {
      throw new ServiceUnavailableException("Clé du compte de service Google Analytics invalide.");
    }
  }
}
