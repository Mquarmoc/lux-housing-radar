import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  activities: defineTable({
    type: v.string(), // "command", "event", "task"
    content: v.string(),
    timestamp: v.number(),
    status: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index("by_timestamp", ["timestamp"]),
  tasks: defineTable({
    name: v.string(),
    schedule: v.string(),
    nextRun: v.number(),
    type: v.string(), 
    status: v.optional(v.string()), 
    summary: v.optional(v.string()), 
  }),
  backlog: defineTable({
    title: v.string(),
    description: v.string(),
    userValue: v.number(), // 1-10
    timeCriticality: v.number(), // 1-10
    riskReduction: v.number(), // 1-10
    jobSize: v.number(), // 1, 2, 3, 5, 8, 13
    score: v.number(), // (UV + TC + RR) / JS
    status: v.string(), // "todo", "in-progress", "done"
    category: v.string(), // "feature", "fix", "research"
  }),
  systemStatus: defineTable({
    key: v.string(),
    data: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  metrics: defineTable({
    model: v.string(),
    timestamp: v.number(),
    pnl: v.optional(v.number()),
    sps: v.optional(v.number()),
    evalSps: v.optional(v.number()),
    gateStatus: v.optional(v.string()), // "pass", "fail", or undefined (unknown)
    gateFailReason: v.optional(v.string()), // e.g. "BUY 99.99% (non-degeneracy), F2 regression"
  }),
  revenue: defineTable({
    product: v.string(),
    status: v.string(),
    price: v.string(),
    platform: v.string(),
    updatedAt: v.number(),
  }),
  forumThreads: defineTable({
    title: v.string(),
    category: v.string(), // "research", "revenue", "infra", "strategy", "general"
    author: v.string(), // "rook", "boss", "codex", "claude"
    body: v.string(),
    pinned: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    replyCount: v.number(),
    lastActivityAt: v.number(),
    createdAt: v.number(),
  }).index("by_lastActivity", ["lastActivityAt"])
    .index("by_category", ["category"]),
  forumReplies: defineTable({
    threadId: v.id("forumThreads"),
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),
  events: defineTable({
    timestamp: v.number(),
    agent: v.string(),
    emoji: v.string(),
    type: v.string(), // "success", "error", "info", "trade"
    message: v.string(),
  }).index("by_timestamp", ["timestamp"]),
  listings: defineTable({
    listingId: v.string(), // e.g. "athome-8994521"
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
    status: v.string(), // "new", "maybe", "rejected", "contacted", "visited", "applied"
    reject_reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    score: v.optional(v.number()),
    added_at: v.number(),
    last_seen: v.number(),
  }).index("by_listingId", ["listingId"]),
  vehicles: defineTable({
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
    status: v.string(),
    notes: v.optional(v.string()),
    reject_reason: v.optional(v.string()),
    score: v.optional(v.number()),
    added_at: v.number(),
    last_seen: v.number(),
  }).index("by_vehicleId", ["vehicleId"]),
});
