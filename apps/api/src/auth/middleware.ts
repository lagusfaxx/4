import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: "UNAUTHENTICATED" });
  if (req.session.role !== "ADMIN") return res.status(403).json({ error: "FORBIDDEN" });
  return next();
}
