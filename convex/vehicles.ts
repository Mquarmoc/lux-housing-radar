import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("vehicles").collect();
  },
});

export const upsert = mutation({
  args: {
    vehicleId: v.string(),
    platform: v.string(),
    url: v.string(),
    title: v.string(),
    model: v.string(),
    year: v.optional(v.number()),
    price: v.optional(v.number()),
    mileage_km: v.optional(v.number()),
    location: v.optional(v.string()),
    autonomy_km: v.optional(v.number()),
    battery_kwh: v.optional(v.number()),
    power_hp: v.optional(v.number()),
    color: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    reject_reason: v.optional(v.string()),
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vehicles")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { last_seen: now });
    } else {
      await ctx.db.insert("vehicles", {
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
    id: v.id("vehicles"),
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
