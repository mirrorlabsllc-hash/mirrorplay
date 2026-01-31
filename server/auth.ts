import 'dotenv/config';
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { pool } from "./db";
import { storage } from "./storage";

const PgSession = ConnectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: any;
  }
}

export async function setupAuth(app: Express) {
  const sessionSecret =
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "dev-session-secret");

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required but was not provided");
  }

  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "sessions",
        createTableIfMissing: false,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const protocol =
      process.env.GOOGLE_OAUTH_PROTOCOL ??
      (process.env.NODE_ENV === "production" ? "https" : "http");
    const host =
      process.env.GOOGLE_OAUTH_HOST ??
      process.env.REPLIT_DOMAINS?.split(",")[0] ??
      `localhost:${process.env.PORT || "5000"}`;
    const callbackURL =
      process.env.GOOGLE_CALLBACK_URL ??
      `${protocol}://${host}/api/auth/google/callback`;

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"), undefined);
            }

            let user = await storage.getUserByEmail(email);

            if (user) {
              if (user.authProvider !== "google") {
                await storage.updateUser(user.id, {
                  authProvider: "google",
                  authProviderId: profile.id,
                  emailVerified: true,
                });
              }
            } else {
              user = await storage.createUser({
                email,
                firstName: profile.name?.givenName || "",
                lastName: profile.name?.familyName || "",
                profileImageUrl: profile.photos?.[0]?.value || "",
                authProvider: "google",
                authProviderId: profile.id,
                emailVerified: true,
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );

    console.log("Google OAuth configured with callback URL:", callbackURL);
    
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/api/auth/google/callback",
      (req, res, next) => {
        passport.authenticate("google", (err: any, user: any, info: any) => {
          if (err) {
            console.error("Google OAuth error:", err);
            return res.redirect("/login?error=google_failed&reason=" + encodeURIComponent(err.message || "unknown"));
          }
          if (!user) {
            console.error("Google OAuth failed - no user returned:", info);
            return res.redirect("/login?error=google_failed&reason=no_user");
          }
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Google OAuth login error:", loginErr);
              return res.redirect("/login?error=google_failed&reason=login_failed");
            }
            console.log("Google OAuth success for user:", user.email);
            // Ensure session is saved before redirecting
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error("Session save error:", saveErr);
                return res.redirect("/login?error=google_failed&reason=session_save_failed");
              }
              res.redirect("/");
            });
          });
        })(req, res, next);
      }
    );
  } else {
    app.get("/api/auth/google", (_req, res) => {
      res.redirect("/login?error=google_unavailable");
    });

    app.get("/api/auth/google/callback", (_req, res) => {
      res.redirect("/login?error=google_unavailable");
    });
  }

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.passwordHash) {
            return done(null, false, {
              message: "Please use the login method you originally signed up with",
            });
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || "",
        lastName: lastName || "",
        authProvider: "email",
        emailVerified: false,
      });

      req.login(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      const err = error as any;
      res.status(500).json({
        message: "Registration failed. Please try again.",
        error: process.env.NODE_ENV !== "production"
          ? err?.message || err?.detail || "Unknown error"
          : undefined,
      });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login failed. Please try again." });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed. Please try again." });
        }
        res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as any;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.get("/api/login", (req, res) => {
    res.redirect("/login");
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
