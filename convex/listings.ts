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
      await ctx.db.patch(existing._id, { last_seen: now });
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
