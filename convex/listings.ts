import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("listings").collect();
  },
});

export const upsert = mutation({
  args: {
    listingId: v.string(),
    platform: v.string(),
    url: v.string(),
    quartier: v.string(),
    rooms: v.optional(v.number()),
    surface_m2: v.optional(v.number()),
    price: v.optional(v.number()),
    charges_eur: v.optional(v.number()),
    bathtub: v.optional(v.boolean()),
    dpe: v.optional(v.string()),
    parking: v.optional(v.boolean()),
    elevator: v.optional(v.boolean()),
    balcony: v.optional(v.boolean()),
    floor: v.optional(v.number()),
    furnished: v.optional(v.boolean()),
    status: v.optional(v.string()),
    reject_reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("listings")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        status: args.status ?? existing.status,
        last_seen: now,
      });
    } else {
      await ctx.db.insert("listings", {
        ...args,
        status: args.status ?? "new",
        added_at: now,
        last_seen: now,
      });
    }
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("listings"),
    status: v.string(),
    reject_reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const enrichByListingId = mutation({
  args: {
    listingId: v.string(),
    quartier: v.optional(v.string()),
    rooms: v.optional(v.number()),
    surface_m2: v.optional(v.number()),
    price: v.optional(v.number()),
    charges_eur: v.optional(v.number()),
    bathtub: v.optional(v.boolean()),
    dpe: v.optional(v.string()),
    parking: v.optional(v.boolean()),
    furnished: v.optional(v.boolean()),
    status: v.optional(v.string()),
    reject_reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("listings")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .unique();

    if (!existing) {
      return { updated: false };
    }

    const patch: Record<string, string | number | boolean> = {};
    if (args.quartier !== undefined) patch.quartier = args.quartier;
    if (args.rooms !== undefined) patch.rooms = args.rooms;
    if (args.surface_m2 !== undefined) patch.surface_m2 = args.surface_m2;
    if (args.price !== undefined) patch.price = args.price;
    if (args.charges_eur !== undefined) patch.charges_eur = args.charges_eur;
    if (args.bathtub !== undefined) patch.bathtub = args.bathtub;
    if (args.dpe !== undefined) patch.dpe = args.dpe;
    if (args.parking !== undefined) patch.parking = args.parking;
    if (args.furnished !== undefined) patch.furnished = args.furnished;
    if (args.status !== undefined) patch.status = args.status;
    if (args.reject_reason !== undefined) patch.reject_reason = args.reject_reason;
    if (args.notes !== undefined) patch.notes = args.notes;

    if (Object.keys(patch).length === 0) {
      return { updated: false };
    }

    await ctx.db.patch(existing._id, patch);
    return { updated: true };
  },
});

export const removeByListingId = mutation({
  args: {
    listingId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("listings")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .unique();

    if (!existing) {
      return { removed: false };
    }

    await ctx.db.delete(existing._id);
    return { removed: true };
  },
});
