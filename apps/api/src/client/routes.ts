import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../auth/middleware";

export const clientRouter = Router();

function parseNumber(value: any): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

clientRouter.get("/categories", asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }]
  });
  res.json({ categories });
}));

clientRouter.get("/professionals", asyncHandler(async (req, res) => {
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const gender = typeof req.query.gender === "string" ? req.query.gender : undefined;
  const tier = typeof req.query.tier === "string" ? req.query.tier : undefined;
  const rangeKm = parseNumber(req.query.rangeKm);
  const lat = parseNumber(req.query.lat);
  const lng = parseNumber(req.query.lng);

  const professionals = await prisma.user.findMany({
    where: {
      profileType: "PROFESSIONAL",
      ...(categoryId ? { categoryId } : {}),
      ...(gender ? { gender } : {}),
      ...(tier ? { tier } : {})
    },
    include: {
      category: true,
      profileMedia: true
    }
  });

  const reviews = await prisma.professionalReview.findMany({
    where: { serviceRequest: { professionalId: { in: professionals.map((p) => p.id) } } },
    include: { serviceRequest: { select: { professionalId: true } } }
  });

  const reviewMap = new Map<string, { total: number; count: number }>();
  for (const review of reviews) {
    const profId = review.serviceRequest.professionalId;
    const entry = reviewMap.get(profId) || { total: 0, count: 0 };
    entry.total += review.hearts;
    entry.count += 1;
    reviewMap.set(profId, entry);
  }

  const results = professionals
    .map((p) => {
      const distance =
        lat !== null && lng !== null && p.latitude !== null && p.longitude !== null
          ? haversineDistanceKm(lat, lng, p.latitude, p.longitude)
          : null;
      const stats = reviewMap.get(p.id);
      return {
        id: p.id,
        name: p.displayName || p.username,
        avatarUrl: p.avatarUrl,
        rating: stats ? Number((stats.total / stats.count).toFixed(1)) : null,
        distance,
        isActive: p.isActive,
        tier: p.tier,
        gender: p.gender,
        category: p.category
          ? { id: p.category.id, name: p.category.name, kind: p.category.kind }
          : null
      };
    })
    .filter((p) => (rangeKm !== null && p.distance !== null ? p.distance <= rangeKm : true));

  res.json({ professionals: results });
}));

clientRouter.get("/professionals/:id", asyncHandler(async (req, res) => {
  const professional = await prisma.user.findFirst({
    where: { id: req.params.id, profileType: "PROFESSIONAL" },
    include: {
      category: true,
      profileMedia: true
    }
  });
  if (!professional) return res.status(404).json({ error: "NOT_FOUND" });

  const reviews = await prisma.professionalReview.findMany({
    where: { serviceRequest: { professionalId: professional.id } }
  });
  const avgRating =
    reviews.length > 0
      ? Number((reviews.reduce((acc, r) => acc + r.hearts, 0) / reviews.length).toFixed(1))
      : null;

  res.json({
    professional: {
      id: professional.id,
      name: professional.displayName || professional.username,
      avatarUrl: professional.avatarUrl,
      category: professional.category ? professional.category.name : null,
      isActive: professional.isActive,
      tier: professional.tier,
      gender: professional.gender,
      description: professional.serviceDescription || professional.bio,
      city: professional.city,
      address: professional.address,
      isOnline: professional.isOnline,
      lastSeen: professional.lastSeen,
      rating: avgRating,
      gallery: professional.profileMedia.map((m) => ({ id: m.id, url: m.url, type: m.type }))
    }
  });
}));

clientRouter.post("/favorites/:professionalId", requireAuth, asyncHandler(async (req, res) => {
  const favorite = await prisma.favorite.upsert({
    where: {
      userId_professionalId: {
        userId: req.session.userId!,
        professionalId: req.params.professionalId
      }
    },
    update: {},
    create: {
      userId: req.session.userId!,
      professionalId: req.params.professionalId
    }
  });
  res.json({ favorite });
}));

clientRouter.delete("/favorites/:professionalId", requireAuth, asyncHandler(async (req, res) => {
  await prisma.favorite.delete({
    where: {
      userId_professionalId: {
        userId: req.session.userId!,
        professionalId: req.params.professionalId
      }
    }
  });
  res.json({ ok: true });
}));

clientRouter.get("/favorites", requireAuth, asyncHandler(async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.session.userId! },
    include: {
      professional: {
        include: { category: true }
      }
    }
  });
  res.json({
    favorites: favorites.map((f) => ({
      id: f.id,
      professional: {
        id: f.professional.id,
        name: f.professional.displayName || f.professional.username,
        avatarUrl: f.professional.avatarUrl,
        rating: null,
        category: f.professional.category?.name || null,
        isActive: f.professional.isActive
      }
    }))
  });
}));

clientRouter.get("/establishments", asyncHandler(async (req, res) => {
  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const rangeKm = parseNumber(req.query.rangeKm);
  const minRating = parseNumber(req.query.minRating);
  const lat = parseNumber(req.query.lat);
  const lng = parseNumber(req.query.lng);

  const establishments = await prisma.establishment.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true, reviews: true }
  });

  const results = establishments
    .map((e) => {
      const avgRating =
        e.reviews.length > 0
          ? Number((e.reviews.reduce((acc, r) => acc + r.stars, 0) / e.reviews.length).toFixed(1))
          : null;
      const distance =
        lat !== null && lng !== null && e.latitude !== null && e.longitude !== null
          ? haversineDistanceKm(lat, lng, e.latitude, e.longitude)
          : null;
      return {
        id: e.id,
        name: e.name,
        city: e.city,
        address: e.address,
        phone: e.phone,
        description: e.description,
        rating: avgRating,
        distance,
        gallery: e.galleryUrls,
        category: e.category ? { id: e.category.id, name: e.category.name } : null
      };
    })
    .filter((e) => (rangeKm !== null && e.distance !== null ? e.distance <= rangeKm : true))
    .filter((e) => (minRating !== null && e.rating !== null ? e.rating >= minRating : true));

  res.json({ establishments: results });
}));

clientRouter.get("/establishments/:id", asyncHandler(async (req, res) => {
  const establishment = await prisma.establishment.findUnique({
    where: { id: req.params.id },
    include: { category: true, reviews: true }
  });
  if (!establishment) return res.status(404).json({ error: "NOT_FOUND" });

  const avgRating =
    establishment.reviews.length > 0
      ? Number(
        (establishment.reviews.reduce((acc, r) => acc + r.stars, 0) / establishment.reviews.length).toFixed(1)
      )
      : null;

  res.json({
    establishment: {
      id: establishment.id,
      name: establishment.name,
      city: establishment.city,
      address: establishment.address,
      phone: establishment.phone,
      description: establishment.description,
      rating: avgRating,
      gallery: establishment.galleryUrls,
      category: establishment.category?.name || null
    }
  });
}));

clientRouter.post("/establishments/:id/reviews", requireAuth, asyncHandler(async (req, res) => {
  const stars = parseNumber(req.body?.stars);
  if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: "INVALID_RATING" });

  const review = await prisma.establishmentReview.create({
    data: {
      establishmentId: req.params.id,
      stars,
      comment: typeof req.body?.comment === "string" ? req.body.comment : null
    }
  });
  res.json({ review });
}));
