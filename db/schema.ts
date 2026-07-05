import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  date,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const roleEnum = pgEnum("role", ["admin", "manager", "member"]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);
export const objectiveEnum = pgEnum("objective", [
  "lead_gen",
  "brand_awareness",
  "sales",
  "engagement",
  "retention",
]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "ads",
  "influencer",
  "content",
  "tools",
  "events",
  "misc",
]);
export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["high", "medium", "low"]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
]);

// ---------- Profiles (mirrors auth.users) ----------
// Populated via trigger on auth.users insert (see supabase/migrations/0001_init.sql)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // == auth.users.id
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  role: roleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Campaigns ----------
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  objective: objectiveEnum("objective").notNull().default("lead_gen"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  targetBudget: numeric("target_budget", { precision: 12, scale: 2 }).notNull(),
  // mock performance inputs, editable by managers/admins to simulate live data feeds
  leadsGenerated: integer("leads_generated").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  revenueValue: numeric("revenue_value", { precision: 12, scale: 2 }).notNull().default("0"),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Campaign Members (junction) ----------
export const campaignMembers = pgTable(
  "campaign_members",
  {
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.campaignId, t.userId] }),
  })
);

// ---------- Expenses ----------
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description"),
  receipt: text("receipt"), // text field per spec (e.g. reference / URL)
  date: date("date").notNull(),
  status: approvalStatusEnum("status").notNull().default("pending"),
  submittedBy: uuid("submitted_by").notNull().references(() => profiles.id),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Tasks ----------
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: uuid("assignee_id").references(() => profiles.id),
  dueDate: date("due_date"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("todo"),
  estimatedHours: numeric("estimated_hours", { precision: 6, scale: 2 }).notNull().default("0"),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("approved"),
  createdBy: uuid("created_by").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Campaign Analytics (daily snapshots, optional mock ingestion) ----------
export const campaignAnalytics = pgTable("campaign_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  spend: numeric("spend", { precision: 12, scale: 2 }).notNull().default("0"),
  leads: integer("leads").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Relations ----------
export const profilesRelations = relations(profiles, ({ many }) => ({
  ownedCampaigns: many(campaigns),
  memberships: many(campaignMembers),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  owner: one(profiles, { fields: [campaigns.ownerId], references: [profiles.id] }),
  members: many(campaignMembers),
  expenses: many(expenses),
  tasks: many(tasks),
  analytics: many(campaignAnalytics),
}));

export const campaignMembersRelations = relations(campaignMembers, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignMembers.campaignId], references: [campaigns.id] }),
  user: one(profiles, { fields: [campaignMembers.userId], references: [profiles.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  campaign: one(campaigns, { fields: [expenses.campaignId], references: [campaigns.id] }),
  submitter: one(profiles, { fields: [expenses.submittedBy], references: [profiles.id] }),
  reviewer: one(profiles, { fields: [expenses.reviewedBy], references: [profiles.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  campaign: one(campaigns, { fields: [tasks.campaignId], references: [campaigns.id] }),
  assignee: one(profiles, { fields: [tasks.assigneeId], references: [profiles.id] }),
  creator: one(profiles, { fields: [tasks.createdBy], references: [profiles.id] }),
}));

export const campaignAnalyticsRelations = relations(campaignAnalytics, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignAnalytics.campaignId], references: [campaigns.id] }),
}));

export type Profile = typeof profiles.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type CampaignAnalytic = typeof campaignAnalytics.$inferSelect;
