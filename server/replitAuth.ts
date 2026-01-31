import * as client from "openid-client";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";

const PgSession = ConnectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId?: string;
    nonce?: string;
    state?: string;
    redirectUri?: string;
    user?: any;
  }
}

let oidcConfig: client.Configuration | null = null;

async function initializeOIDC() {
  if (oidcConfig) return oidcConfig;

  try {
    const issuerUrl = new URL("https://replit.com/");
    const clientId = process.env.REPLIT_DEPLOYMENT_ID || process.env.REPL_ID;
    if (!clientId) {
      console.error("No REPLIT_DEPLOYMENT_ID or REPL_ID found");
      return null;
    }
    oidcConfig = await client.discovery(issuerUrl, clientId);
    return oidcConfig;
  } catch (error) {
    console.error("OIDC discovery failed:", error);
    return null;
  }
}

export async function setupAuth(app: Express) {
  app.use(
    session({
      store: new PgSession({ 
        pool: pool,
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      }
    })
  );

  // Login route
  app.get("/api/login", async (req, res) => {
    try {
      const config = await initializeOIDC();
      if (!config) {
        return res.status(500).send("Authentication service unavailable. Please try again later.");
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const redirectUri = `${protocol}://${host}/api/callback`;

      const nonce = client.randomNonce();
      const state = client.randomState();

      req.session.nonce = nonce;
      req.session.state = state;
      req.session.redirectUri = redirectUri;

      const authUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: "openid profile email",
        response_type: "code",
        nonce,
        state,
      });

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).send("Session error. Please try again.");
        }
        res.redirect(authUrl.href);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send("Login failed. Please try again.");
    }
  });

  // Callback route
  app.get("/api/callback", async (req, res) => {
    try {
      const config = await initializeOIDC();
      if (!config) {
        return res.status(500).send("Authentication service unavailable");
      }

      const nonce = req.session.nonce;
      const state = req.session.state;
      const redirectUri = req.session.redirectUri;

      if (!nonce || !state || !redirectUri) {
        console.error("Missing session data in callback:", { 
          hasNonce: !!nonce, 
          hasState: !!state, 
          hasRedirectUri: !!redirectUri,
          sessionId: req.sessionID
        });
        return res.status(400).send("Session expired. Please try logging in again.");
      }

      const currentUrl = new URL(req.url, `${req.headers["x-forwarded-proto"] || req.protocol}://${req.headers["x-forwarded-host"] || req.get("host")}`);
      
      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        expectedNonce: nonce,
        expectedState: state,
      });

      const claims = tokens.claims();
      if (!claims) {
        return res.status(500).send("Failed to get user claims");
      }

      // Upsert user
      const user = await storage.upsertUser({
        id: claims.sub,
        email: claims.email as string || null,
        firstName: claims.first_name as string || null,
        lastName: claims.last_name as string || null,
        profileImageUrl: claims.profile_image_url as string || null,
      });

      // Ensure user has progress
      const progress = await storage.getProgress(user.id);
      if (!progress) {
        await storage.createProgress({ userId: user.id });
      }

      req.session.userId = user.id;
      req.session.user = { claims };

      delete req.session.nonce;
      delete req.session.state;
      delete req.session.redirectUri;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error after login:", err);
          return res.status(500).send("Failed to save session. Please try again.");
        }
        res.redirect("/");
      });
    } catch (error) {
      console.error("Callback error:", error);
      res.status(500).send("Authentication failed. Please try again.");
    }
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
